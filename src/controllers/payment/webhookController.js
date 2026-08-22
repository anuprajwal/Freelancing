const crypto = require("crypto");
const {
  sequelize,
  WebhookEvent,
  payments,
  transfer,
  settlement,
  doctorProfile,
  appointments
} = require("../../../models");

exports.handleWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  console.log("Webhook received:", req.body.toString("utf8"));
  if (!webhookSecret) {
    console.error("Webhook secret not configured");
    return res.status(500).send("Webhook secret not configured");
  }
  console.log("Webhook secret:", webhookSecret);

  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  console.log("Received signature:", signature);
  console.log("Expected signature:", expected);

  if (expected !== signature) {
    return res.status(400).send("Invalid signature");
  }
  console.log("Signature verified successfully");

  const bodyJson = JSON.parse(rawBody.toString("utf8"));
  const eventId = bodyJson.id;
  const eventType = bodyJson.event;

  if (!eventId) {
    return res.status(400).send("Invalid event id");
  }

  console.log("Processing event:", eventType, "with ID:", eventId);

  /* ================= IDEMPOTENCY ================= */

  const existingEvent = await WebhookEvent.findOne({
    where: { event_id: eventId }
  });

  console.log("Existing event found:", existingEvent ? "Yes" : "No");

  if (existingEvent) {
    return res.status(200).send("Already processed");
  }

  console.log("Creating new event record for processing");

  const eventRecord = await WebhookEvent.create({
    event_id: eventId,
    event_type: eventType,
    payload: bodyJson,
    processed: false,
  });

  console.log("Event record created with ID:", eventRecord.id);

  const t = await sequelize.transaction();

  try {
    console.log("Starting transaction for event processing");

    switch (eventType) {

      /* ======================================================
         PAYMENT CAPTURED
      ====================================================== */
      case "payment.captured": {
        console.log("Payment captured event received:", bodyJson);
        const entity = bodyJson.payload.payment.entity;
        console.log("Payment entity:", entity);

        const paymentRecord = await payments.findOne({
          where: { razorpay_order_id: entity.order_id },
          transaction: t,
        });

        if (paymentRecord && paymentRecord.payment_status !== "paid") {

          await paymentRecord.update({
            payment_status: "paid",
            razorpay_order_id: entity.id,
            payment_method: entity.method,
            payment_date: new Date()
          }, { transaction: t });

          const appointment = await appointments.findByPk(
            paymentRecord.appointment_id,
            { transaction: t }
          );

          if (appointment) {
            await appointment.update(
              { status: "confirmed" },
              { transaction: t }
            );
          }
        }

        break;
      }

      /* ======================================================
         PAYMENT FAILED
      ====================================================== */
      case "payment.failed": {
        console.log("Payment failed event received:", bodyJson);
        const entity = bodyJson.payload.payment.entity;
        console.log("Payment entity:", entity);

        await payments.update({
          payment_status: "failed",
          payment_method: entity.method || "unknown"
        }, {
          where: { razorpay_order_id: entity.order_id },
          transaction: t
        });

        break;
      }

      /* ======================================================
         TRANSFER EVENTS
      ====================================================== */
      case "transfer.processed":
      case "transfer.paid":
      case "transfer.failed": {
        console.log("Transfer event received:", bodyJson);

        const transferEntity = bodyJson.payload.transfer.entity;
        console.log("Transfer entity:", transferEntity);

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

        /* ---------- Settlement Dedupe ---------- */
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

      /* ======================================================
         ACCOUNT KYC EVENTS
      ====================================================== */
      case "account.activated":
      case "account.kyc.verified":
      case "account.rejected":
      case "account.kyc.rejected": {
        console.log("Account KYC event received:", bodyJson);

        const accId = bodyJson.payload.account.entity.id;
        console.log("Account ID:", accId);

        const doctor = await doctorProfile.findOne({
          where: { rzp_account_id: accId },
          transaction: t,
        });

        if (doctor) {
          await doctor.update({
            kyc_status:
              eventType === "account.kyc.verified"
                ? "verified"
                : "rejected"
          }, { transaction: t });
        }

        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
        break;
    }

    await eventRecord.update({ processed: true }, { transaction: t });

    await t.commit();
    return res.status(200).send("ok");

  } catch (err) {
    console.log("Error processing webhook:", err);

    await t.rollback();

    await eventRecord.update({
      processed: false,
      processing_error: err.message
    });

    console.log("Webhook failed:", err);
    return res.status(500).send("Processing failed");
  }
};
