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

  console.log("Raw body:", rawBody.toString("utf8"));

  const bodyJson = JSON.parse(rawBody.toString("utf8"));
  const eventId = req.headers["x-razorpay-event-id"];

  const eventType = bodyJson.event;

  if (!eventId) {
    console.error("Invalid event id:", eventId);
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
        console.log("Payment record found:", paymentRecord ? "Yes" : "No");

        if (paymentRecord && paymentRecord.payment_status !== "paid") {
          console.log("Updating payment record to 'paid' status for order ID:", entity.order_id);

          await paymentRecord.update({
            payment_status: "paid",
            razorpay_order_id: entity.id,
            payment_method: entity.method,
            payment_date: new Date()
          }, { transaction: t });
          console.log("Payment record updated successfully");

          const appointment = await appointments.findByPk(
            paymentRecord.appointment_id,
            { transaction: t }
          );
          console.log("Associated appointment found:", appointment ? "Yes" : "No");

          if (appointment) {
            console.log("Updating appointment status to 'confirmed' for appointment ID:", appointment.id);
            await appointment.update(
              { appointment_status: "confirmed" },
              { transaction: t }
            );
          }
          console.log("Appointment status updated successfully");
        }
        console.log("Payment processing completed for order ID:", entity.order_id);

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
          where: { razorpay_order_id: entity.source },
          transaction: t
        });
        console.log("Payment record updated to 'failed' status for order ID:", entity.order_id);

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

        console.log("Local transfer record found:", localTransfer ? "Yes" : "No");

        if (!localTransfer) {
          localTransfer = await transfer.findOne({
            where: {
              order_id: transferEntity.source,
              amount: transferEntity.amount,
            },
            transaction: t,
          });
        }
        console.log("Local transfer record found after fallback:", localTransfer ? "Yes" : "No");

        if (!localTransfer) break;
        console.log("Updating local transfer record with Razorpay transfer ID and status");

        await localTransfer.update({
          razorpay_transfer_id: transferEntity.id,
          status: transferEntity.status,
          raw_payload: transferEntity,
        }, { transaction: t });
        console.log("Local transfer record updated successfully");

        /* ---------- Settlement Dedupe ---------- */
        if (["processed", "paid"].includes(transferEntity.status)) {
          console.log("Checking for existing settlement record for Razorpay transfer ID:", transferEntity.id);

          const existingSettlement = await settlement.findOne({
            where: { razorpay_transfer_id: transferEntity.id },
            transaction: t,
          });
          console.log("Existing settlement record found:", existingSettlement ? "Yes" : "No");

          if (!existingSettlement) {
            console.log("Creating new settlement record for Razorpay transfer ID:", transferEntity.id);
            await settlement.create({
              transfer_id: localTransfer.id,
              razorpay_transfer_id: transferEntity.id,
              doctor_id: localTransfer.doctor_id,
              amount: localTransfer.amount,
              currency: localTransfer.currency,
              status: transferEntity.status,
            }, { transaction: t });
            console.log("Settlement record created successfully");
          }
          console.log("Settlement record already exists, skipping creation");
        }
        console.log("Transfer event processing completed for Razorpay transfer ID:", transferEntity.id);

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
        console.log("Associated doctor profile found:", doctor ? "Yes" : "No");

        if (doctor) {
          console.log("Updating doctor's KYC status based on event type:", eventType);
          await doctor.update({
            kyc_status:
              eventType === "account.kyc.verified"
                ? "verified"
                : "rejected"
          }, { transaction: t });
          console.log("Doctor's KYC status updated successfully");
        }
        console.log("Account KYC event processing completed for account ID:", accId);

        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
        break;
    }
    console.log("Marking event record as processed for event ID:", eventId);

    await eventRecord.update({ processed: true }, { transaction: t });
    console.log("Event record marked as processed successfully");
    await t.commit();
    console.log("Transaction committed successfully for event ID:", eventId);
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
