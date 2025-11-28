const crypto = require("crypto");
const razorpay = require("../../utils/razorpay");
const { payments, appointments, doctorProfile } = require("../../models");


const createOrder = async (req, res) => {
  try {
    const {
      amount,
      appointmentId,
      patientName,
      patientEmail,
      doctorId,
      appointmentDate,
      appointmentTime,
    } = req.body;

    if (!amount || !appointmentId || !patientEmail || !doctorId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const doctor = await doctorProfile.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (doctor.kyc_status !== "verified") {
      return res.status(400).json({ success: false, message: "Doctor KYC not verified" });
    }

    // Calculate split
    const joinedAt = doctor.joined_at;
    const now = new Date();
    const diffMonths = (now.getFullYear() - joinedAt.getFullYear()) * 12 + (now.getMonth() - joinedAt.getMonth());
    const companyShare = diffMonths < 2 ? 0.10 : 0.30;
    const doctorShare = 1 - companyShare;
    const doctorAmount = Math.round(amount * doctorShare * 100);
    const companyAmount = Math.round(amount * companyShare * 100);

    // Create Razorpay order with transfers
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${appointmentId}`,
      notes: { appointmentId, patientName, patientEmail, doctorId, appointmentDate, appointmentTime },
      transfers: [
        {
          account: doctor.rzp_account_id,
          amount: doctorAmount,
          currency: "INR",
          on_hold: false,
          fee_bearer: "recipient",
          notes: { doctorId, appointmentId },
        },
        {
          account: process.env.COMPANY_RZP_ACCOUNT_ID,
          amount: companyAmount,
          currency: "INR",
          on_hold: false,
          notes: { appointmentId },
        },
      ],
    });

    // Save payment record
    await payments.create({
      user_id: req.user?.id || null,
      appointment_id: appointmentId,
      payment_status: "pending",
      payment_date: new Date(),
      payment_amount: amount,
      doctor_amount: doctorAmount / 100,
      company_amount: companyAmount / 100,
      payment_method: "card",
      transaction_id: order.id,
      payment_notes: JSON.stringify({ patientName, patientEmail, doctorId, appointmentDate, appointmentTime }),
    });

    res.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID },
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};


const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const paymentRecord = await payments.findOne({ where: { transaction_id: razorpay_order_id } });
    if (!paymentRecord) return res.status(404).json({ success: false, message: "Payment record not found" });

    await paymentRecord.update({ payment_status: "paid", transaction_id: razorpay_payment_id });

    const appointment = await appointments.findByPk(paymentRecord.appointment_id);
    if (appointment) await appointment.update({ status: "confirmed", paymentStatus: "paid" });

    res.json({ success: true, message: "Payment verified successfully", appointmentId: paymentRecord.appointment_id });
  } catch (err) {
    console.error("Error in verifyPayment:", err);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};


const getPaymentStatus = async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) return res.status(400).json({ success: false, message: "Order ID is required" });

  try {
    const order = await razorpay.orders.fetch(orderId);
    res.json({ success: true, status: order.status, order });
  } catch (error) {
    console.error("Error getting payment status:", error);
    res.status(500).json({ success: false, message: "Failed to get status" });
  }
};


const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: "Payment ID required" });

    const payment = await razorpay.payments.fetch(paymentId);
    res.json({ success: true, payment });
  } catch (err) {
    console.error("Error fetching payment details:", err);
    res.status(500).json({ success: false, message: "Failed to get payment details" });
  }
};


const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, message: "Payment ID required" });

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    res.json({ success: true, refund });
  } catch (err) {
    console.error("Error refunding payment:", err);
    res.status(500).json({ success: false, message: "Refund failed" });
  }
};


const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;

    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(JSON.stringify(body)).digest("hex");
    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const { event, payload } = body;

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
      case "transfer.processed": {
        const entity = payload.transfer.entity;
        const paymentRecord = await payments.findOne({ where: { transaction_id: entity.order_id } });
        if (paymentRecord) await paymentRecord.update({ rzp_transfer_id: entity.id });
        break;
      }
      case "transfer.failed":
        console.log("Transfer failed for order:", payload.transfer.entity.order_id);
        break;
      default:
        console.log("Unhandled Webhook Event:", event);
    }

    res.status(200).json({ success: true, message: "Webhook handled" });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentDetails,
  refundPayment,
  handleWebhook,
};
