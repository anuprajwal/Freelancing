// controllers/payment/paymentController.js

const crypto = require("crypto");
const { razorpay } = require("../../services/rzpService");
const {
  payments,
  appointments,
  doctorProfile,
  transfer: TransferModel
} = require("../../../models");

/* =====================================================
   CREATE ORDER
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { amount, appointmentId, doctorId } = req.body;

    if (!amount || !appointmentId || !doctorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doctor = await doctorProfile.findByPk(doctorId);

    if (!doctor || doctor.kyc_status !== "verified") {
      return res.status(400).json({
        message: "Doctor not eligible for payments"
      });
    }

    const totalPaise = Math.round(Number(amount) * 100);

    const order = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `appt_${appointmentId}_${Date.now()}`,
      notes: { appointmentId, doctorId }
    });

    await payments.create({
      user_id: req.user.id,   // FIXED
      appointment_id: appointmentId,
      payment_status: "pending",
      payment_amount: amount,
      payment_date: new Date(),
      payment_method: "pending",
      transaction_id: order.id
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("createOrder:", err.response?.data || err.message);
    return res.status(500).json({ message: "Order creation failed" });
  }
};


/* =====================================================
   VERIFY PAYMENT (Lightweight)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    await payments.update(
      { payment_status: "verification_pending" },
      { where: { transaction_id: razorpay_order_id } }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("verifyPayment:", err.message);
    return res.status(500).json({ success: false });
  }
};


/* =====================================================
   REFUND
===================================================== */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID required" });
    }

    const paymentRecord = await payments.findOne({
      where: { transaction_id: paymentId }
    });

    if (!paymentRecord || paymentRecord.payment_status === "refunded") {
      return res.status(400).json({ message: "Invalid refund request" });
    }

    const refund = await razorpay.payments.refund(paymentId);

    await paymentRecord.update({ payment_status: "refunded" });

    return res.json({ success: true, refund });

  } catch (err) {
    console.error("refund:", err.response?.data || err.message);
    return res.status(500).json({ message: "Refund failed" });
  }
};


/* =====================================================
   GET ORDER STATUS
===================================================== */
exports.getPaymentStatus = async (req, res) => {
  try {
    const order = await razorpay.orders.fetch(req.params.orderId);
    return res.json({ status: order.status });
  } catch {
    return res.status(500).json({ message: "Failed to fetch status" });
  }
};


/* =====================================================
   GET PAYMENT DETAILS
===================================================== */
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    return res.json(payment);
  } catch {
    return res.status(500).json({ message: "Failed to fetch payment" });
  }
};


/* =====================================================
   WEBHOOK (Authoritative)
===================================================== */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)   // raw buffer
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    switch (event.event) {

      /* ---------------- PAYMENT CAPTURED ---------------- */
      case "payment.captured": {
        const entity = event.payload.payment.entity;

        const paymentRecord = await payments.findOne({
          where: { transaction_id: entity.order_id }
        });

        if (paymentRecord && paymentRecord.payment_status !== "paid") {

          await paymentRecord.update({
            payment_status: "paid",
            transaction_id: entity.id,     // replace order id with payment id
            payment_method: entity.method,
            payment_date: new Date()
          });

          const appointment = await appointments.findByPk(paymentRecord.appointment_id);
          if (appointment) {
            await appointment.update({ status: "confirmed" });
          }
        }

        break;
      }

      /* ---------------- PAYMENT FAILED ---------------- */
      case "payment.failed": {
        const entity = event.payload.payment.entity;

        await payments.update(
          {
            payment_status: "failed",
            payment_method: entity.method || "unknown"
          },
          { where: { transaction_id: entity.order_id } }
        );

        break;
      }

      /* ---------------- REFUND ---------------- */
      case "refund.processed": {
        const r = event.payload.refund.entity;

        await payments.update(
          { payment_status: "refunded" },
          { where: { transaction_id: r.payment_id } }
        );

        break;
      }

      default:
        break;
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).send("Webhook failed");
  }
};
