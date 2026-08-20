// const crypto = require("crypto");
// const { razorpay } = require("../../services/rzpService");
// const {
//   payments,
//   sequelize,
//   appointments,
//   doctorProfile,
// } = require("../../../models");

// const PLATFORM_COMMISSION_PERCENTAGE = 10; // 10% platform fee

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
//   patientUserId 
// ) => {
//   try {
//     // 1. Backend Input Validation
//     if (!appointmentId || !doctorId || !patientUserId) {
//       throw new Error("Missing critical identifiers for payment initialization.");
//     }

//     // 2. Validate Appointment & Ownership
//     const appointment = await appointments.findOne({
//       where: { 
//         id: appointmentId,
//         user_id: patientUserId, // Ensure appointment belongs to the requesting patient
//         doctor_id: doctorId
//       }
//     });

//     if (!appointment) {
//       throw new Error("Invalid appointment or access unauthorized.");
//     }


//     // 3. Fetch Doctor Profile & Validate Razorpay Route Account
//     const doctor = await doctorProfile.findOne({
//       where: { user_id: doctorId }
//     });

//     if (!doctor || doctor.kyc_status !== "verified") {
//       throw new Error("Doctor is not eligible to receive payments.");
//     }

//     if (!doctor.rzp_account_id) {
//       throw new Error("Doctor payout account configuration is missing.");
//     }

//     // 4. Authoritative Pricing Verification
//     // Use the backend appointment/consultation fee; fall back to passed amount if verified
//     const finalAmountInRupees = Number(appointment.consultation_fee || amount);
//     if (isNaN(finalAmountInRupees) || finalAmountInRupees <= 0) {
//       throw new Error("Invalid transaction amount.");
//     }

//     // Convert to lowest currency unit (Paise for INR)
//     const totalPaise = Math.round(finalAmountInRupees * 100);
//     const adminCommissionPaise = Math.round((totalPaise * PLATFORM_COMMISSION_PERCENTAGE) / 100);
//     const doctorSharePaise = totalPaise - adminCommissionPaise; // 90% share to doctor

//     if (doctorSharePaise <= 0) {
//       throw new Error("Doctor split calculation resulted in an invalid sub-zero amount.");
//     }

//     // 5. Create Razorpay Order with Direct Route Transfers
//     const orderPayload = {
//       amount: totalPaise,
//       currency: "INR",
//       receipt: `appt_${appointmentId}_${Date.now()}`,
//       notes: {
//         appointmentId: String(appointmentId),
//         doctorId: String(doctorId),
//         patientUserId: String(patientUserId),
//         organisation_id: String(organisation_id || ""),
//         adminCommissionPaise: String(adminCommissionPaise),
//         doctorSharePaise: String(doctorSharePaise)
//       },
//       transfers: [
//         {
//           account: doctor.rzp_account_id,
//           amount: doctorSharePaise,
//           currency: "INR",
//           notes: {
//             appointmentId: String(appointmentId),
//             role: "doctor_consultation_share"
//           },
//           on_hold: 0 // Automatically eligible for settlement to doctor's bank account
//         }
//       ]
//     };

//     const order = await razorpay.orders.create(orderPayload);

//     // 6. Persist Pending Payment Record within Database Transaction
//     await payments.create({
//       user_id: patientUserId,
//       appointment_id: appointmentId,
//       payment_status: "pending",
//       payment_amount: finalAmountInRupees,
//       payment_date: new Date(),
//       payment_method: payment_mode || "online",
//       transaction_id: order.id,
//       payment_notes: JSON.stringify({
//         notes: notes || {},
//         split: {
//           total: totalPaise / 100,
//           doctorShare: doctorSharePaise / 100,
//           adminCommission: adminCommissionPaise / 100,
//           doctorAccountId: doctor.rzp_account_id
//         }
//       }),
//       organisation_id: organisation_id,
//       razorpay_order_id: order.id
//     });

//     return {
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       key: process.env.RAZORPAY_KEY_ID
//     };

//   } catch (err) {
//     console.error("createOrder Error:", err.response?.data || err.message);
//     throw err;
//   }
// };

// /* =====================================================
//    VERIFY PAYMENT
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature
//   } = req.body;

//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing required payment verification parameters."
//     });
//   }

//   // 1. Constant-Time Timing-Safe HMAC SHA256 Verification
//   try {
//     const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(payload)
//       .digest("hex");

//     const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
//     const receivedBuffer = Buffer.from(razorpay_signature, "utf-8");

//     if (
//       expectedBuffer.length !== receivedBuffer.length ||
//       !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Cryptographic signature mismatch. Verification failed."
//       });
//     }
//   } catch (cryptoErr) {
//     return res.status(400).json({
//       success: false,
//       message: "Malformed signature payload."
//     });
//   }

//   // 2. Fetch Authoritative Status from Razorpay Gateway
//   try {
//     const payment = await razorpay.payments.fetch(razorpay_payment_id);

//     if (!payment || payment.status !== "captured") {
//       return res.status(400).json({
//         success: false,
//         message: `Payment is uncaptured. Current status: ${payment?.status || "unknown"}`
//       });
//     }

//     // 3. Atomic Database Operations & Idempotency Check
//     const transaction = await sequelize.transaction();

//     try {
//       const paymentRecord = await payments.findOne({
//         where: { razorpay_order_id: razorpay_order_id },
//         lock: transaction.LOCK.UPDATE, // Row-level lock against concurrent race conditions
//         transaction
//       });

//       if (!paymentRecord) {
//         await transaction.rollback();
//         return res.status(404).json({
//           success: false,
//           message: "No matching payment record found for this order ID."
//         });
//       }

//       // Idempotency: Return 200 OK immediately if already confirmed
//       if (paymentRecord.payment_status === "paid") {
//         await transaction.commit();
//         return res.status(200).json({
//           success: true,
//           message: "Payment was already verified and confirmed.",
//           appointmentId: paymentRecord.appointment_id
//         });
//       }

//       // Verify payment order association matches gateway records
//       if (payment.order_id !== paymentRecord.razorpay_order_id) {
//         await transaction.rollback();
//         return res.status(400).json({
//           success: false,
//           message: "Mismatched Razorpay Order association."
//         });
//       }

//       // Update payment record to paid
//       await paymentRecord.update(
//         {
//           payment_status: "paid",
//           razorpay_payment_id: razorpay_payment_id,
//           payment_date: new Date()
//         },
//         { transaction }
//       );

//       // Confirm the corresponding appointment
//       if (paymentRecord.appointment_id) {
//         await appointments.update(
//           { appointment_status: "confirmed" },
//           {
//             where: { id: paymentRecord.appointment_id },
//             transaction
//           }
//         );
//       }

//       await transaction.commit();

//       return res.status(200).json({
//         success: true,
//         message: "Payment successfully verified and appointment confirmed.",
//         appointmentId: paymentRecord.appointment_id
//       });

//     } catch (dbError) {
//       await transaction.rollback();
//       throw dbError;
//     }

//   } catch (err) {
//     console.error("verifyPayment Error:", err.response?.data || err.message);
//     return res.status(500).json({
//       success: false,
//       message: "An internal error occurred during payment verification."
//     });
//   }
// };

// /* =====================================================
//    REFUND
// ===================================================== */
// exports.refundPayment = async (req, res) => {
//   const { paymentId, reason } = req.body;

//   if (!paymentId) {
//     return res.status(400).json({ success: false, message: "Payment ID is required." });
//   }

//   const transaction = await sequelize.transaction();

//   try {
//     const paymentRecord = await payments.findOne({
//       where: { razorpay_payment_id: paymentId },
//       lock: transaction.LOCK.UPDATE,
//       transaction
//     });

//     if (!paymentRecord || paymentRecord.payment_status !== "paid") {
//       await transaction.rollback();
//       return res.status(400).json({
//         success: false,
//         message: "Invalid refund target: record not found or not in a 'paid' state."
//       });
//     }

//     // Process Razorpay full refund and reverse the Route transfer from the doctor's account
//     const refund = await razorpay.payments.refund(paymentId, {
//       reverse_all: 1, // Automatically claws back doctor's 90% share
//       notes: {
//         reason: reason || "Appointment cancelled by patient/doctor",
//         initiatedBy: req.user?.payload?.id ? String(req.user.payload.id) : "system"
//       }
//     });

//     // Update payment record
//     await paymentRecord.update(
//       { payment_status: "refunded" },
//       { transaction }
//     );

//     // Cancel appointment associated with refunded transaction
//     if (paymentRecord.appointment_id) {
//       await appointments.update(
//         { appointment_status: "cancelled" },
//         {
//           where: { id: paymentRecord.appointment_id },
//           transaction
//         }
//       );
//     }

//     await transaction.commit();

//     return res.status(200).json({
//       success: true,
//       message: "Payment refunded and transfer clawed back successfully.",
//       refund
//     });

//   } catch (err) {
//     await transaction.rollback();
//     console.error("refundPayment Error:", err.response?.data || err.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to execute refund.",
//       error: err.response?.data || err.message
//     });
//   }
// };

// /* =====================================================
//    GET ORDER STATUS
// ===================================================== */
// exports.getPaymentStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     if (!orderId) {
//       return res.status(400).json({ message: "Order ID is required." });
//     }

//     const order = await razorpay.orders.fetch(orderId);
//     return res.status(200).json({ success: true, status: order.status });
//   } catch (err) {
//     console.error("getPaymentStatus Error:", err.response?.data || err.message);
//     return res.status(500).json({ success: false, message: "Failed to fetch order status." });
//   }
// };

// /* =====================================================
//    GET PAYMENT DETAILS
// ===================================================== */
// exports.getPaymentDetails = async (req, res) => {
//   try {
//     const { paymentId } = req.params;
//     if (!paymentId) {
//       return res.status(400).json({ message: "Payment ID is required." });
//     }

//     const payment = await razorpay.payments.fetch(paymentId);
//     return res.status(200).json({ success: true, payment });
//   } catch (err) {
//     console.error("getPaymentDetails Error:", err.response?.data || err.message);
//     return res.status(500).json({ success: false, message: "Failed to fetch payment details." });
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
  organisationProfile,
} = require("../../../models");

const PLATFORM_COMMISSION_PERCENTAGE = 10; // 10% platform fee

/* =====================================================
   CREATE DOCTOR ORDER (Private Helper)
===================================================== */
const createDoctorOrder = async (
  amount,
  appointmentId,
  doctorId,
  notes,
  payment_mode,
  patientUserId
) => {
  // 1. Fetch Doctor Profile & Validate Razorpay Route Account
  const doctor = await doctorProfile.findOne({
    where: { user_id: doctorId }
  });

  if (!doctor || doctor.kyc_status !== "verified") {
    throw new Error("Doctor is not eligible to receive payments.");
  }

  if (!doctor.rzp_account_id) {
    throw new Error("Doctor payout account configuration is missing.");
  }

  // 2. Authoritative Pricing Verification
  const finalAmountInRupees = Number(amount);
  if (isNaN(finalAmountInRupees) || finalAmountInRupees <= 0) {
    throw new Error("Invalid doctor consultation amount.");
  }

  // Convert to lowest currency unit (Paise for INR)
  const totalPaise = Math.round(finalAmountInRupees * 100);
  const adminCommissionPaise = Math.round((totalPaise * PLATFORM_COMMISSION_PERCENTAGE) / 100);
  const doctorSharePaise = totalPaise - adminCommissionPaise; // 90% share to doctor

  if (doctorSharePaise <= 0) {
    throw new Error("Doctor split calculation resulted in an invalid sub-zero amount.");
  }

  // 3. Create Razorpay Order with Direct Route Transfers to Doctor
  const orderPayload = {
    amount: totalPaise,
    currency: "INR",
    receipt: `appt_doc_${appointmentId}_${Date.now()}`,
    notes: {
      appointmentId: String(appointmentId),
      doctorId: String(doctorId),
      patientUserId: String(patientUserId),
      entity_type: "doctor",
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
        on_hold: 0
      }
    ]
  };

  const order = await razorpay.orders.create(orderPayload);

  // 4. Persist Payment Record
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
      entity_type: "doctor",
      split: {
        total: totalPaise / 100,
        recipientShare: doctorSharePaise / 100,
        adminCommission: adminCommissionPaise / 100,
        recipientAccountId: doctor.rzp_account_id
      }
    }),
    organisation_id: null,
    razorpay_order_id: order.id
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID
  };
};

/* =====================================================
   CREATE HOSPITAL / ORGANISATION ORDER (Private Helper)
===================================================== */
const createHospitalOrder = async (
  amount,
  appointmentId,
  organisationId,
  doctorId,
  notes,
  payment_mode,
  patientUserId
) => {
  // 1. Fetch Organisation Profile & Verify KYC Eligibility
  let org = await organisationProfile.findByPk(organisationId);
  if (!org) {
    org = await organisationProfile.findOne({
      where: { user_id: organisationId }
    });
  }

  if (!org || org.kyc_status !== "verified") {
    throw new Error("Hospital organization is not eligible to receive payments.");
  }

  if (!org.rzp_account_id) {
    throw new Error("Hospital payout account configuration is missing.");
  }

  // 2. Authoritative Pricing Verification
  const finalAmountInRupees = Number(amount);
  if (isNaN(finalAmountInRupees) || finalAmountInRupees <= 0) {
    throw new Error("Invalid hospital consultation amount.");
  }

  // Convert to lowest currency unit (Paise for INR)
  const totalPaise = Math.round(finalAmountInRupees * 100);
  const adminCommissionPaise = Math.round((totalPaise * PLATFORM_COMMISSION_PERCENTAGE) / 100);
  const hospitalSharePaise = totalPaise - adminCommissionPaise; // 90% share to hospital

  if (hospitalSharePaise <= 0) {
    throw new Error("Hospital split calculation resulted in an invalid sub-zero amount.");
  }

  // 3. Create Razorpay Order with Direct Route Transfers to Organisation
  const orderPayload = {
    amount: totalPaise,
    currency: "INR",
    receipt: `appt_org_${appointmentId}_${Date.now()}`,
    notes: {
      appointmentId: String(appointmentId),
      doctorId: String(doctorId),
      organisation_id: String(org.id),
      patientUserId: String(patientUserId),
      entity_type: "hospital_organisation",
      adminCommissionPaise: String(adminCommissionPaise),
      hospitalSharePaise: String(hospitalSharePaise)
    },
    transfers: [
      {
        account: org.rzp_account_id,
        amount: hospitalSharePaise,
        currency: "INR",
        notes: {
          appointmentId: String(appointmentId),
          organisation_id: String(org.id),
          role: "hospital_consultation_share"
        },
        on_hold: 0
      }
    ]
  };

  const order = await razorpay.orders.create(orderPayload);

  // 4. Persist Payment Record under Organisation ID
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
      entity_type: "hospital_organisation",
      organisation_id: org.id,
      split: {
        total: totalPaise / 100,
        recipientShare: hospitalSharePaise / 100,
        adminCommission: adminCommissionPaise / 100,
        recipientAccountId: org.rzp_account_id
      }
    }),
    organisation_id: org.id,
    razorpay_order_id: order.id
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID
  };
};

/* =====================================================
   MAIN UNIFIED CREATE ORDER ENTRYPOINT
===================================================== */
exports.createOrder = async (
  amount,
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
        user_id: patientUserId,
        doctor_id: doctorId
      }
    });

    if (!appointment) {
      throw new Error("Invalid appointment or access unauthorized.");
    }

    const finalAmount = Number(appointment.consultation_fee || amount);

    // 3. Dynamic Pipeline Routing: Hospital vs. Doctor
    if (organisation_id) {
      return await createHospitalOrder(
        finalAmount,
        appointmentId,
        organisation_id,
        doctorId,
        notes,
        payment_mode,
        patientUserId
      );
    } else {
      return await createDoctorOrder(
        finalAmount,
        appointmentId,
        doctorId,
        notes,
        payment_mode,
        patientUserId
      );
    }
  } catch (err) {
    console.error("createOrder Error:", err);
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
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!paymentRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "No matching payment record found for this order ID."
        });
      }

      if (paymentRecord.payment_status === "paid") {
        await transaction.commit();
        return res.status(200).json({
          success: true,
          message: "Payment was already verified and confirmed.",
          appointmentId: paymentRecord.appointment_id
        });
      }

      if (payment.order_id !== paymentRecord.razorpay_order_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Mismatched Razorpay Order association."
        });
      }

      await paymentRecord.update(
        {
          payment_status: "paid",
          razorpay_payment_id: razorpay_payment_id,
          payment_date: new Date()
        },
        { transaction }
      );

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

    const refund = await razorpay.payments.refund(paymentId, {
      reverse_all: 1, // Automatically claws back recipient's 90% share
      notes: {
        reason: reason || "Appointment cancelled by patient or provider",
        initiatedBy: req.user?.payload?.id ? String(req.user.payload.id) : "system"
      }
    });

    await paymentRecord.update(
      { payment_status: "refunded" },
      { transaction }
    );

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