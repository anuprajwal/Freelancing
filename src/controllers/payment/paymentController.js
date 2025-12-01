// controllers/payment/paymentController.js
const crypto = require("crypto");
const { createOrderWithTransfers, razorpay } = require("../../services/rzpService");
const { payments, appointments, doctorProfile } = require("../../../models");

/**
 * POST /payment/create-order
 * body: { amount, appointmentId, patientName, patientEmail, doctorId, appointmentDate, appointmentTime }
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, appointmentId, patientName, patientEmail, doctorId, appointmentDate, appointmentTime } = req.body;
    if (!amount || !appointmentId || !patientEmail || !doctorId) return res.status(400).json({ message: "Missing required fields" });

    const doctor = await doctorProfile.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (doctor.kyc_status !== "verified") return res.status(400).json({ message: "Doctor KYC not verified" });

    const joinedAt = doctor.joined_at;
    const now = new Date();
    const diffMonths = (now.getFullYear() - new Date(joinedAt).getFullYear()) * 12 + (now.getMonth() - new Date(joinedAt).getMonth());
    const companyShare = diffMonths < 2 ? 0.10 : 0.30;
    const doctorShare = 1 - companyShare;

    const orderAmountPaise = Math.round(Number(amount) * 100);
    const doctorAmountPaise = Math.floor(orderAmountPaise * doctorShare);
    const companyAmountPaise = orderAmountPaise - doctorAmountPaise;

    const orderPayload = {
      amount: orderAmountPaise,
      currency: "INR",
      receipt: `receipt_${appointmentId}_${Date.now()}`,
      notes: { appointmentId, patientName, patientEmail, doctorId, appointmentDate, appointmentTime },
      transfers: [
        {
          account: doctor.rzp_account_id,
          amount: doctorAmountPaise,
          currency: "INR",
          on_hold: false,
          fee_bearer: "recipient",
          notes: { doctorId, appointmentId }
        }
      ]
    };

    // Optionally include explicit platform transfer if env set
    // if (process.env.COMPANY_RZP_ACCOUNT_ID) {
    //   orderPayload.transfers.push({
    //     account: process.env.COMPANY_RZP_ACCOUNT_ID,
    //     amount: companyAmountPaise,
    //     currency: "INR",
    //     on_hold: false,
    //     notes: { appointmentId }
    //   });
    // }

    const order = await razorpay.orders.create(orderPayload);

   
    const paymentRecord = await payments.create({
      user_id: req.user?.id || null,
      appointment_id: appointmentId,
      payment_status: "pending",
      payment_date: new Date(),
      payment_amount: amount,
      doctor_amount: doctorAmountPaise / 100,
      company_amount: companyAmountPaise / 100,
      payment_method: "card",
      transaction_id: order.id,
      payment_notes: JSON.stringify({ patientName, patientEmail, doctorId, appointmentDate, appointmentTime }),
    });

    // Persist transfers locally for bookkeeping (one per transfer in orderPayload.transfers)
    const { transfer } = require('../../../models'); 
    const TransferModel = require('../../../models').transfer; 

    // Insert transfer rows for each transfer (idempotent: check if exists by order_id + account)
    for (const t of orderPayload.transfers) {
      // create local transfer record with status 'created'
      await TransferModel.create({
        razorpay_transfer_id: null,
        order_id: order.id,
        payment_id: order.id, // will update to actual payment id on webhook
        appointment_id: appointmentId,
        doctor_id: t.account === doctor.rzp_account_id ? doctor.id : null,
        amount: t.amount,
        currency: t.currency,
        status: 'created',
        raw_payload: null,
      });
    }

    return res.json({ order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID } });
  } catch (err) {
    console.error("createOrder err:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

/**
 * POST /verify-payment
 * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RZP_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const paymentRecord = await payments.findOne({ where: { transaction_id: razorpay_order_id } });
    if (!paymentRecord) return res.status(404).json({ success: false, message: "Payment record not found" });

    await paymentRecord.update({ payment_status: "paid", transaction_id: razorpay_payment_id });

    const appointment = await appointments.findByPk(paymentRecord.appointment_id);
    if (appointment) await appointment.update({ status: "confirmed", paymentStatus: "paid" });

    return res.json({ success: true, message: "Payment verified", appointmentId: paymentRecord.appointment_id });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

/**
 * GET /status/:orderId
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ success: false, message: "Order ID required" });
    const order = await razorpay.orders.fetch(orderId);
    return res.json({ success: true, status: order.status, order });
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    return res.status(500).json({ success: false, message: "Failed to get status" });
  }
};

/**
 * GET /payment/:paymentId
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: "Payment ID required" });
    const payment = await razorpay.payments.fetch(paymentId);
    return res.json({ success: true, payment });
  } catch (err) {
    console.error("getPaymentDetails error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch payment details" });
  }
};

/**
 * POST /refund
 * body: { paymentId, amount? }
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, message: "Payment ID required" });
    const refund = await razorpay.payments.refund(paymentId, amount ? { amount: Math.round(Number(amount) * 100) } : {});
    return res.json({ success: true, refund });
  } catch (err) {
    console.error("refundPayment error:", err);
    return res.status(500).json({ success: false, message: "Refund failed" });
  }
};

/**
 * POST /webhook  (raw body)
 * Handles: payment.captured, transfer.processed, transfer.failed, account.kyc.verified/rejected
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const payloadRaw = req.rawBody || req.body; // ensure raw if middleware provides
    // Validate signature
    const expected = crypto.createHmac("sha256", process.env.RZP_WEBHOOK_SECRET || "").update(JSON.stringify(payloadRaw)).digest("hex");
    if (!signature || expected !== signature) {
      console.error("Webhook signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const { event, payload } = payloadRaw;

    switch (event) {
      case "payment.captured": {
        const entity = payload.payment.entity;
        const paymentRecord = await payments.findOne({ where: { transaction_id: entity.order_id } });
        if (paymentRecord && paymentRecord.payment_status !== "paid") {
          await paymentRecord.update({
            payment_status: "paid",
            transaction_id: entity.id,
            payment_method: entity.method || "card",
            payment_date: new Date(),
          });
          const appointment = await appointments.findByPk(paymentRecord.appointment_id);
          if (appointment) await appointment.update({ status: "confirmed", paymentStatus: "paid" });
        }
        break;
      }

      case "transfer.processed":
      case "transfer.paid": {
        const t = payload.transfer.entity;
        // find payments by order_id (transfers created via order include order_id)
        const paymentRecord = await payments.findOne({ where: { transaction_id: t.order_id } });
        if (paymentRecord) {
          await paymentRecord.update({ rzp_transfer_id: t.id, transfer_status: t.status });
        }
        break;
      }

      case "transfer.failed": {
        const t = payload.transfer.entity;
        const paymentRecord = await payments.findOne({ where: { transaction_id: t.order_id } });
        if (paymentRecord) await paymentRecord.update({ transfer_status: t.status });
        console.error("Transfer failed:", t);
        break;
      }

      case "account.kyc.verified":
      case "account.kyc.rejected": {
        const acc = payload.account.entity;
        const doctor = await doctorProfile.findOne({ where: { rzp_account_id: acc.id } });
        if (doctor) {
          doctor.kyc_status = event === "account.kyc.verified" ? "verified" : "rejected";
          await doctor.save();
        }
        break;
      }

      default:
        // ignore other events
        break;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("handleWebhook err:", err.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
