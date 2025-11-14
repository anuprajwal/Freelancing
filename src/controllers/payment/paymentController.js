const razorpay = require("../../utils/razorpay");
const verifyRazorpaySignature = require("../../utils/verifySignature");
const { createPaymentRecord, updatePaymentSuccess } = require("../../services/paymentService");

// const createOrder = async (req, res) => {
//   try {
//     const {
//       amount,
//       appointmentId,
//       patientName,
//       patientEmail,
//       doctorName,
//       appointmentDate,
//       appointmentTime,
//     } = req.body;

//     const user_id = req.user.payload.id;
//     if (!user_id || !amount || !appointmentId) {
//       return res.status(400).json({ error: "Missing required data" });
//     }

//     const notes = { patientName, patientEmail, doctorName, appointmentDate, appointmentTime, appointmentId };
//     const options = {
//       amount: Math.round(amount * 100),
//       currency: "INR",
//       receipt: `rcpt_${appointmentId}`,
//       notes,
//     };

//     const order = await razorpay.orders.create(options);

//     return res.status(200).json({
//       success: true,
//       order: {
//         id: order.id,
//         amount: order.amount,
//         currency: order.currency,
//         key: process.env.RAZORPAY_KEY_ID,
//       },
//     });
//   } catch (err) {
//     console.error("Error in createOrder:", err);
//     return res.status(500).json({ error: "Order creation failed" });
//   }
// };

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    await updatePaymentSuccess(razorpay_order_id, razorpay_payment_id);

    return res.status(200).json({ message: "Payment verified successfully" });
  } catch (err) {
    console.error("Error in verifyPayment:", err);
    return res.status(500).json({ error: "Payment verification failed" });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSignature = req.headers["x-razorpay-signature"];
    const payload = JSON.stringify(req.body); // required for accurate HMAC

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      console.warn("Webhook signature mismatch");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const entity = req.body.payload?.payment?.entity || req.body.payload?.order?.entity;

    switch (event) {
      case "payment.captured":
        console.log("Webhook: Payment Captured", entity.id);

        const paymentRecord = await payments.findOne({ where: { transaction_id: entity.order_id } });
        if (paymentRecord && paymentRecord.payment_status !== "paid") {
          await paymentRecord.update({
            payment_status: "paid",
            transaction_id: entity.id,
            payment_method: "card",
            payment_date: new Date(),
          });

          const appointment = await appointments.findByPk(paymentRecord.appointment_id);
          if (appointment) {
            await appointment.update({ status: "confirmed", paymentStatus: "paid" });
          }
        }
        break;

      case "payment.failed":
        console.log("Webhook: Payment Failed", entity.id);
        // Log, notify, or update failed status
        break;

      case "refund.created":
        console.log("Webhook: Refund Created", entity.id);
        // Optional: log for auditing
        break;

      default:
        console.log("Unhandled webhook event:", event);
    }

    return res.status(200).json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

const getPaymentStatus = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  try {
    const order = await razorpay.orders.fetch(orderId);

    res.status(200).json({
      success: true,
      status: order.status, 
      order,
    });
  } catch (error) {
    console.error("Error getting Razorpay order status:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment status" });
  }
};

module.exports = { verifyPayment, handleWebhook, getPaymentStatus };
