// controllers/payment/paymentController.js

const crypto = require("crypto");
const { razorpay } = require("../../services/rzpService");
const {
  payments,
  sequelize,
  appointments,
  doctorProfile,
} = require("../../../models");

/* =====================================================
   CREATE ORDER (Helper Function)
===================================================== */
exports.createOrder = async (
  amount, 
  appointmentId, 
  doctorId, 
  notes, 
  payment_mode, 
  organisation_id, 
  patientUserId // Passed explicitly from req.user.payload.id
) => {
  try {
    if (!amount || !appointmentId || !doctorId) {
      throw new Error("Missing required fields for payment order creation.");
    }

    const doctor = await doctorProfile.findOne({
      where: { user_id: doctorId }
    });

    if (!doctor || doctor.kyc_status !== "verified") {
      throw new Error("Doctor is not eligible to receive payments.");
    }

    const totalPaise = Math.round(Number(amount) * 100);

    // 1. Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `appt_${appointmentId}_${Date.now()}`,
      notes: { appointmentId, doctorId }
    });

    // 2. Log Pending Payment Record
    await payments.create({
      user_id: patientUserId,
      appointment_id: appointmentId,
      payment_status: "pending",
      payment_amount: amount,
      payment_date: new Date(),
      payment_method: payment_mode,
      transaction_id: order.id,
      payment_notes: JSON.stringify(notes || {}),
      organisation_id: organisation_id,
      razorpay_order_id: order.id
    });

    // 3. Return payload back to the main controller
    return {
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID
    };

  } catch (err) {
    console.error("createOrder Helper Error:", err.response?.data || err.message);
    throw err; // Re-throw to be caught by the parent route handler
  }
};

/* =====================================================
   VERIFY PAYMENT (Lightweight)
===================================================== */
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  // Validate incoming parameters
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing required payment verification parameters"
    });
  }

  // 1. Verify Razorpay HMAC SHA256 Signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid signature. Payment verification failed"
    });
  }

  try {
    // 2. Fetch payment details from Razorpay to verify capture status
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!payment || payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment is not successful. Current status: ${payment?.status || 'unknown'}`
      });
    }

    // 3. Begin Atomic Database Transaction
    const transaction = await sequelize.transaction();

    try {
      // Find the specific payment record using the razorpay_order_id
      const paymentRecord = await payments.findOne({
        where: { razorpay_order_id: razorpay_order_id },
        transaction
      });

      if (!paymentRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Payment record not found for the given order ID"
        });
      }

      // Update the payment record status to paid
      await paymentRecord.update(
        {
          payment_status: "paid",
          razorpay_payment_id: razorpay_payment_id,
          payment_method: payment.method || "card",
          payment_date: new Date()
        },
        { transaction }
      );

      // Extract appointment ID and update appointment status to confirmed
      const targetAppointmentId = paymentRecord.appointment_id;

      if (targetAppointmentId) {
        await appointments.update(
          { appointment_status: "confirmed" },
          {
            where: { id: targetAppointmentId },
            transaction
          }
        );
      }

      // Commit transaction
      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Payment verified and appointment confirmed successfully",
        appointmentId: targetAppointmentId
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (err) {
    console.error("verifyPayment Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred during payment verification and confirmation"
    });
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


