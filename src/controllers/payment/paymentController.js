// // controllers/payment/paymentController.js

// const crypto = require("crypto");
// const { razorpay } = require("../../services/rzpService");
// const {
//   payments,
//   sequelize,
//   appointments,
//   doctorProfile,
// } = require("../../../models");

// /* =====================================================
//    CREATE ORDER (Helper Function)
// ===================================================== */
// exports.createOrder = async (
//   amount, 
//   appointmentId, 
//   doctorId, 
//   notes, 
//   payment_mode, 
//   organisation_id, 
//   patientUserId // Passed explicitly from req.user.payload.id
// ) => {
//   try {
//     if (!amount || !appointmentId || !doctorId) {
//       throw new Error("Missing required fields for payment order creation.");
//     }

//     const doctor = await doctorProfile.findOne({
//       where: { user_id: doctorId }
//     });

//     if (!doctor || doctor.kyc_status !== "verified") {
//       throw new Error("Doctor is not eligible to receive payments.");
//     }

//     const totalPaise = Math.round(Number(amount) * 100);

//     // 1. Create Razorpay Order
//     const order = await razorpay.orders.create({
//       amount: totalPaise,
//       currency: "INR",
//       receipt: `appt_${appointmentId}_${Date.now()}`,
//       notes: { appointmentId, doctorId, organisation_id }
//     });

//     // 2. Log Pending Payment Record
//     await payments.create({
//       user_id: patientUserId,
//       appointment_id: appointmentId,
//       payment_status: "pending",
//       payment_amount: amount,
//       payment_date: new Date(),
//       payment_method: payment_mode,
//       transaction_id: order.id,
//       payment_notes: JSON.stringify(notes || {}),
//       organisation_id: organisation_id,
//       razorpay_order_id: order.id
//     });

//     // 3. Return payload back to the main controller
//     return {
//       orderId: order.id,
//       amount: order.amount,
//       key: process.env.RAZORPAY_KEY_ID
//     };

//   } catch (err) {
//     console.error("createOrder Helper Error:", err.response?.data || err.message);
//     throw err; // Re-throw to be caught by the parent route handler
//   }
// };

// /* =====================================================
//    VERIFY PAYMENT (Lightweight)
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature
//   } = req.body;

//   // Validate incoming parameters
//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing required payment verification parameters"
//     });
//   }

//   // 1. Verify Razorpay HMAC SHA256 Signature
//   const body = razorpay_order_id + "|" + razorpay_payment_id;
//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//     .update(body)
//     .digest("hex");

//   if (expectedSignature !== razorpay_signature) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid signature. Payment verification failed"
//     });
//   }

//   try {
//     // 2. Fetch payment details from Razorpay to verify capture status
//     const payment = await razorpay.payments.fetch(razorpay_payment_id);

//     if (!payment || payment.status !== "captured") {
//       return res.status(400).json({
//         success: false,
//         message: `Payment is not successful. Current status: ${payment?.status || 'unknown'}`
//       });
//     }

//     // 3. Begin Atomic Database Transaction
//     const transaction = await sequelize.transaction();

//     try {
//       // Find the specific payment record using the razorpay_order_id
//       const paymentRecord = await payments.findOne({
//         where: { razorpay_order_id: razorpay_order_id },
//         transaction
//       });

//       if (!paymentRecord) {
//         await transaction.rollback();
//         return res.status(404).json({
//           success: false,
//           message: "Payment record not found for the given order ID"
//         });
//       }

//       // Update the payment record status to paid
//       await paymentRecord.update(
//         {
//           payment_status: "paid",
//           razorpay_payment_id: razorpay_payment_id,
//           payment_date: new Date()
//         },
//         { transaction }
//       );

//       // Extract appointment ID and update appointment status to confirmed
//       const targetAppointmentId = paymentRecord.appointment_id;

//       if (targetAppointmentId) {
//         await appointments.update(
//           { appointment_status: "confirmed" },
//           {
//             where: { id: targetAppointmentId },
//             transaction
//           }
//         );
//       }

//       // Commit transaction
//       await transaction.commit();

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified and appointment confirmed successfully",
//         appointmentId: targetAppointmentId
//       });

//     } catch (dbError) {
//       await transaction.rollback();
//       throw dbError;
//     }

//   } catch (err) {
//     console.error("verifyPayment Error:", err.response?.data || err.message);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred during payment verification and confirmation"
//     });
//   }
// };
// /* =====================================================
//    REFUND
// ===================================================== */
// exports.refundPayment = async (req, res) => {
//   try {
//     const { paymentId } = req.body;

//     if (!paymentId) {
//       return res.status(400).json({ message: "Payment ID required" });
//     }

//     const paymentRecord = await payments.findOne({
//       where: { transaction_id: paymentId }
//     });

//     if (!paymentRecord || paymentRecord.payment_status === "refunded") {
//       return res.status(400).json({ message: "Invalid refund request" });
//     }

//     const refund = await razorpay.payments.refund(paymentId);

//     await paymentRecord.update({ payment_status: "refunded" });

//     return res.json({ success: true, refund });

//   } catch (err) {
//     console.error("refund:", err.response?.data || err.message);
//     return res.status(500).json({ message: "Refund failed" });
//   }
// };


// /* =====================================================
//    GET ORDER STATUS
// ===================================================== */
// exports.getPaymentStatus = async (req, res) => {
//   try {
//     const order = await razorpay.orders.fetch(req.params.orderId);
//     return res.json({ status: order.status });
//   } catch {
//     return res.status(500).json({ message: "Failed to fetch status" });
//   }
// };


// /* =====================================================
//    GET PAYMENT DETAILS
// ===================================================== */
// exports.getPaymentDetails = async (req, res) => {
//   try {
//     const payment = await razorpay.payments.fetch(req.params.paymentId);
//     return res.json(payment);
//   } catch {
//     return res.status(500).json({ message: "Failed to fetch payment" });
//   }
// };




// controllers/payment/paymentController.js

const crypto = require("crypto");
const { razorpay } = require("../../services/rzpService");
const {
  payments,
  sequelize,
  appointments,
  doctorProfile,
} = require("../../../models");

const PLATFORM_COMMISSION_PERCENTAGE = 10; // 10% platform fee

/* =====================================================
   CREATE ORDER (Helper Function)
===================================================== */

exports.createOrder = async (
  amount, // Passed for cross-verification
  appointmentId, 
  doctorId, 
  notes, 
  payment_mode, 
  organisation_id, 
  patientUserId 
) => {
  try {
    // 1. Backend Input Validation
    if (!appointmentId || !doctorId || !patientUserId) {
      throw new Error("Missing critical identifiers for payment initialization.");
    }

    // 2. Validate Appointment & Ownership
    const appointment = await appointments.findOne({
      where: { 
        id: appointmentId,
        user_id: patientUserId, // Ensure appointment belongs to the requesting patient
        doctor_id: doctorId
      }
    });

    if (!appointment) {
      throw new Error("Invalid appointment or access unauthorized.");
    }

    if (["completed", "confirmed", "cancelled"].includes(appointment.appointment_status)) {
      throw new Error(`Appointment cannot be paid for in '${appointment.appointment_status}' state.`);
    }

    // 3. Fetch Doctor Profile & Validate Razorpay Route Account
    const doctor = await doctorProfile.findOne({
      where: { user_id: doctorId }
    });

    if (!doctor || doctor.kyc_status !== "verified") {
      throw new Error("Doctor is not eligible to receive payments.");
    }

    if (!doctor.rzp_account_id) {
      throw new Error("Doctor payout account configuration is missing.");
    }

    // 4. Authoritative Pricing Verification
    // Use the backend appointment/consultation fee; fall back to passed amount if verified
    const finalAmountInRupees = Number(appointment.consultation_fee || amount);
    if (isNaN(finalAmountInRupees) || finalAmountInRupees <= 0) {
      throw new Error("Invalid transaction amount.");
    }

    // Convert to lowest currency unit (Paise for INR)
    const totalPaise = Math.round(finalAmountInRupees * 100);
    const adminCommissionPaise = Math.round((totalPaise * PLATFORM_COMMISSION_PERCENTAGE) / 100);
    const doctorSharePaise = totalPaise - adminCommissionPaise; // 90% share to doctor

    if (doctorSharePaise <= 0) {
      throw new Error("Doctor split calculation resulted in an invalid sub-zero amount.");
    }

    // 5. Create Razorpay Order with Direct Route Transfers
    const orderPayload = {
      amount: totalPaise,
      currency: "INR",
      receipt: `appt_${appointmentId}_${Date.now()}`,
      notes: {
        appointmentId: String(appointmentId),
        doctorId: String(doctorId),
        patientUserId: String(patientUserId),
        organisation_id: String(organisation_id || ""),
        adminCommissionPaise: String(adminCommissionPaise),
        doctorSharePaise: String(doctorSharePaise)
      },
      transfers: [
        {
          account: doctor.rzp_account_id,
          amount: doctorSharePaise,
          currency: "INR",
          notes: {
            appointmentId: String(appointmentId),
            role: "doctor_consultation_share"
          },
          on_hold: 0 // Automatically eligible for settlement to doctor's bank account
        }
      ]
    };

    const order = await razorpay.orders.create(orderPayload);

    // 6. Persist Pending Payment Record within Database Transaction
    await payments.create({
      user_id: patientUserId,
      appointment_id: appointmentId,
      payment_status: "pending",
      payment_amount: finalAmountInRupees,
      payment_date: new Date(),
      payment_method: payment_mode || "online",
      transaction_id: order.id,
      payment_notes: JSON.stringify({
        notes: notes || {},
        split: {
          total: totalPaise / 100,
          doctorShare: doctorSharePaise / 100,
          adminCommission: adminCommissionPaise / 100,
          doctorAccountId: doctor.rzp_account_id
        }
      }),
      organisation_id: organisation_id,
      razorpay_order_id: order.id
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    };

  } catch (err) {
    console.error("createOrder Error:", err.response?.data || err.message);
    throw err;
  }
};

/* =====================================================
   VERIFY PAYMENT
===================================================== */
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing required payment verification parameters."
    });
  }

  // 1. Constant-Time Timing-Safe HMAC SHA256 Verification
  try {
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf-8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cryptographic signature mismatch. Verification failed."
      });
    }
  } catch (cryptoErr) {
    return res.status(400).json({
      success: false,
      message: "Malformed signature payload."
    });
  }

  // 2. Fetch Authoritative Status from Razorpay Gateway
  try {
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!payment || payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment is uncaptured. Current status: ${payment?.status || "unknown"}`
      });
    }

    // 3. Atomic Database Operations & Idempotency Check
    const transaction = await sequelize.transaction();

    try {
      const paymentRecord = await payments.findOne({
        where: { razorpay_order_id: razorpay_order_id },
        lock: transaction.LOCK.UPDATE, // Row-level lock against concurrent race conditions
        transaction
      });

      if (!paymentRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "No matching payment record found for this order ID."
        });
      }

      // Idempotency: Return 200 OK immediately if already confirmed
      if (paymentRecord.payment_status === "paid") {
        await transaction.commit();
        return res.status(200).json({
          success: true,
          message: "Payment was already verified and confirmed.",
          appointmentId: paymentRecord.appointment_id
        });
      }

      // Verify payment order association matches gateway records
      if (payment.order_id !== paymentRecord.razorpay_order_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Mismatched Razorpay Order association."
        });
      }

      // Update payment record to paid
      await paymentRecord.update(
        {
          payment_status: "paid",
          razorpay_payment_id: razorpay_payment_id,
          payment_date: new Date()
        },
        { transaction }
      );

      // Confirm the corresponding appointment
      if (paymentRecord.appointment_id) {
        await appointments.update(
          { appointment_status: "confirmed" },
          {
            where: { id: paymentRecord.appointment_id },
            transaction
          }
        );
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Payment successfully verified and appointment confirmed.",
        appointmentId: paymentRecord.appointment_id
      });

    } catch (dbError) {
      await transaction.rollback();
      throw dbError;
    }

  } catch (err) {
    console.error("verifyPayment Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during payment verification."
    });
  }
};

/* =====================================================
   REFUND
===================================================== */
exports.refundPayment = async (req, res) => {
  const { paymentId, reason } = req.body;

  if (!paymentId) {
    return res.status(400).json({ success: false, message: "Payment ID is required." });
  }

  const transaction = await sequelize.transaction();

  try {
    const paymentRecord = await payments.findOne({
      where: { razorpay_payment_id: paymentId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!paymentRecord || paymentRecord.payment_status !== "paid") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid refund target: record not found or not in a 'paid' state."
      });
    }

    // Process Razorpay full refund and reverse the Route transfer from the doctor's account
    const refund = await razorpay.payments.refund(paymentId, {
      reverse_all: 1, // Automatically claws back doctor's 90% share
      notes: {
        reason: reason || "Appointment cancelled by patient/doctor",
        initiatedBy: req.user?.payload?.id ? String(req.user.payload.id) : "system"
      }
    });

    // Update payment record
    await paymentRecord.update(
      { payment_status: "refunded" },
      { transaction }
    );

    // Cancel appointment associated with refunded transaction
    if (paymentRecord.appointment_id) {
      await appointments.update(
        { appointment_status: "cancelled" },
        {
          where: { id: paymentRecord.appointment_id },
          transaction
        }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Payment refunded and transfer clawed back successfully.",
      refund
    });

  } catch (err) {
    await transaction.rollback();
    console.error("refundPayment Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to execute refund.",
      error: err.response?.data || err.message
    });
  }
};

/* =====================================================
   GET ORDER STATUS
===================================================== */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const order = await razorpay.orders.fetch(orderId);
    return res.status(200).json({ success: true, status: order.status });
  } catch (err) {
    console.error("getPaymentStatus Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch order status." });
  }
};

/* =====================================================
   GET PAYMENT DETAILS
===================================================== */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID is required." });
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error("getPaymentDetails Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch payment details." });
  }
};