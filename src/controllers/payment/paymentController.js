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

    const doctor = await doctorProfile.findOne({
      where: { user_id: doctorId }
    });

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
      user_id: req.user.payload.id,
   // FIXED
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
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // 1. Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expected !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }

        // 2. Fetch payment from Razorpay
        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        // 3. Check actual payment status
        if (payment.status !== "captured") {
            return res.status(400).json({
                success: false,
                message: `Payment is not successful. Status: ${payment.status}`
            });
        }

        // 4. Update your database
        await payments.update(
            {
                payment_status: "paid",
                // optionally store razorpay_payment_id
                // razorpay_payment_id: razorpay_payment_id
            },
            {
                where: {
                    transaction_id: razorpay_order_id
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully"
        });

    } catch (err) {
        console.error("verifyPayment:", err.message);

        return res.status(500).json({
            success: false,
            message: "Payment verification failed"
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


