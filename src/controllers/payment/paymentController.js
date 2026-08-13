// controllers/payment/paymentController.js

const crypto = require("crypto");
const { razorpay } = require("../../services/rzpService");
const {
  payments,
  appointments,
  doctorProfile,
} = require("../../../models");

/* =====================================================
   CREATE ORDER
===================================================== */
// exports.createOrder = async (amount, appointmentId, doctorId, notes, payment_mode, organisation_id) => {
//   try {

//     if (!amount || !appointmentId || !doctorId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const doctor = await doctorProfile.findOne({
//       where: { user_id: doctorId }
//     });

//     if (!doctor || doctor.kyc_status !== "verified") {
//       return res.status(400).json({
//         message: "Doctor not eligible for payments"
//       });
//     }

//     const totalPaise = Math.round(Number(amount) * 100);

//     const order = await razorpay.orders.create({
//       amount: totalPaise,
//       currency: "INR",
//       receipt: `appt_${appointmentId}_${Date.now()}`,
//       notes: { appointmentId, doctorId }
//     });

//     await payments.create({
//       user_id: req.user.payload.id,
//       appointment_id: appointmentId,
//       payment_status: "pending",
//       payment_amount: amount,
//       payment_date: new Date(),
//       payment_method: payment_mode,
//       transaction_id: order.id,
//       payment_notes: JSON.stringify(notes),
//       organisation_id: organisation_id,
//       razorpay_order_id: order.id

//     });

//     return res.json({
//       orderId: order.id,
//       amount: order.amount,
//       key: process.env.RAZORPAY_KEY_ID
//     });

//   } catch (err) {
//     console.error("createOrder:", err.response?.data || err.message);
//     return res.status(500).json({ message: "Order creation failed" });
//   }
// };


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
                razorpay_payment_id: razorpay_payment_id
            },
            {
                where: {
                    razorpay_order_id: razorpay_order_id
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


