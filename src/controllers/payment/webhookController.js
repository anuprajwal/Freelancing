const crypto = require("crypto");
const { sequelize, WebhookEvent, payments, transfer, settlement, doctorProfile, appointments } = require("../../../models");

exports.handleWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).send("Webhook secret not configured");

  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature)
    return res.status(400).send("Invalid signature");

  const bodyJson = JSON.parse(rawBody.toString("utf8"));
  const eventId = bodyJson.id; // ✅ TRUE EVENT ID
  const eventType = bodyJson.event;

  // 🔒 IDEMPOTENCY CHECK
  const existingEvent = await WebhookEvent.findOne({ where: { event_id: eventId } });
  if (existingEvent) {
    return res.status(200).send("Already processed");
  }

  // Save event first
  const eventRecord = await WebhookEvent.create({
    event_id: eventId,
    event_type: eventType,
    payload: bodyJson,
    processed: false,
  });

  const t = await sequelize.transaction();

  try {

    switch (eventType) {

      /* ================= PAYMENT CAPTURED ================= */
      case "payment.captured": {
        const entity = bodyJson.payload.payment.entity;
        const orderId = entity.order_id;

        const paymentRecord = await payments.findOne({
          where: { transaction_id: orderId },
          transaction: t,
        });

        if (paymentRecord && paymentRecord.payment_status !== "paid") {

          await paymentRecord.update({
            payment_status: "paid",
            transaction_id: entity.id,
          }, { transaction: t });

          const appointment = await appointments.findByPk(
            paymentRecord.appointment_id,
            { transaction: t }
          );

          if (appointment)
            await appointment.update({ status: "confirmed" }, { transaction: t });
        }

        break;
      }

      /* ================= TRANSFER PROCESSED ================= */
      case "transfer.processed":
      case "transfer.paid":
      case "transfer.failed": {

        const transferEntity = bodyJson.payload.transfer.entity;

        let localTransfer = await transfer.findOne({
          where: { razorpay_transfer_id: transferEntity.id },
          transaction: t,
        });

        if (!localTransfer) {
          localTransfer = await transfer.findOne({
            where: {
              order_id: transferEntity.order_id,
              amount: transferEntity.amount,
            },
            transaction: t,
          });
        }

        if (!localTransfer) break;

        await localTransfer.update({
          razorpay_transfer_id: transferEntity.id,
          status: transferEntity.status,
          raw_payload: transferEntity,
        }, { transaction: t });

        // 🔒 Settlement dedupe
        if (["processed", "paid"].includes(transferEntity.status)) {

          const existingSettlement = await settlement.findOne({
            where: { razorpay_transfer_id: transferEntity.id },
            transaction: t,
          });

          if (!existingSettlement) {
            await settlement.create({
              transfer_id: localTransfer.id,
              razorpay_transfer_id: transferEntity.id,
              doctor_id: localTransfer.doctor_id,
              amount: localTransfer.amount,
              currency: localTransfer.currency,
              status: transferEntity.status,
            }, { transaction: t });
          }
        }

        break;
      }

      /* ================= ACCOUNT KYC ================= */
      case "account.kyc.verified":
      case "account.kyc.rejected": {

        const accId = bodyJson.payload.account.entity.id;

        const doctor = await doctorProfile.findOne({
          where: { rzp_account_id: accId },
          transaction: t,
        });

        if (doctor) {
          await doctor.update({
            kyc_status: eventType === "account.kyc.verified" ? "verified" : "rejected"
          }, { transaction: t });
        }

        break;
      }

      default:
        break;
    }

    await eventRecord.update({ processed: true }, { transaction: t });

    await t.commit();
    return res.status(200).send("ok");

  } catch (err) {
    await t.rollback();

    await eventRecord.update({
      processed: false,
      processing_error: err.message
    });

    console.error("Webhook failed:", err);
    return res.status(500).send("Processing failed");
  }
};
