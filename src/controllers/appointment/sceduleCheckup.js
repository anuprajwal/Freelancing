const { 
  appointments, 
  doctorSlots, 
  checkupAppointment, 
  doctorProfile, 
  payments,
  User
} = require('../../../models');

const checkSlotAvailability = require("../slots/checkSlots");
const checkAnotherAppointment = require("../slots/checkAppointmentAvailability");
const logger = require("../../../logger");

// CHANGED: Imported createOrder from paymentController
const { createOrder } = require("../payment/paymentController");

const scheduleCheckup = async (req, res) => {
  try {
    const { appointment_id, date: dateStr, start, end, type } = req.body;
    const requesterUserId = req.user.payload.id;

    // Basic validation
    if (!appointment_id || !dateStr || !start || !end || !type) {
      return res.status(400).json({ error: "appointment_id, date, start, end and type are required" });
    }

    if (!['online_video', 'online_audio', 'offline'].includes(type)) {
      return res.status(400).json({ error: "Invalid appointment type" });
    }

    // Parse dates: appointment_date comes from DB (Date), dateStr may be string
    const appointmentData = await appointments.findByPk(appointment_id);

    if (!appointmentData) {
      return res.status(404).json({ error: "Parent appointment not found" });
    }

    // Parent appointment must be closed
    if (appointmentData.appointment_status !== "closed") {
      return res.status(400).json({ error: "Parent appointment must be in 'closed' status to schedule a checkup" });
    }

    // Ensure requester is owner of parent appointment (optional security)
    if (parseInt(appointmentData.user_id, 10) !== parseInt(requesterUserId, 10)) {
      return res.status(403).json({ error: "You are not authorized to schedule a checkup for this appointment" });
    }

    // Check existing checkup for this appointment_id
    const { Op } = require('sequelize');
    const existing = await checkupAppointment.findOne({
      where: {
        appointment_id,
        checkup_status: { [Op.in]: ['pending', 'confirmed', 'completed'] }
      }
    });

    if (existing) {
      return res.status(400).json({ error: "A follow-up checkup already exists for this appointment" });
    }

    // Parse and normalize dates (midnight) for difference calculation
    const parentDate = new Date(appointmentData.appointment_date);
    const requestedDate = new Date(dateStr);

    // Normalize to start of day (UTC-safe)
    const parentMid = Date.UTC(parentDate.getFullYear(), parentDate.getMonth(), parentDate.getDate());
    const requestedMid = Date.UTC(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate());

    const diffDays = Math.round((requestedMid - parentMid) / (1000 * 60 * 60 * 24));

    // Rule checks
    if (diffDays < 5) {
      return res.status(400).json({ error: "Checkup cannot be scheduled less than 5 days after the appointment" });
    }

    let checkupStatus = "pending";
    let isPaymentRequired = true;
    if (diffDays >= 5 && diffDays <= 15) {
      checkupStatus = "confirmed";
      isPaymentRequired = false;
    } else if (diffDays > 15) {
      checkupStatus = "pending";
      isPaymentRequired = true;
    }

    // Validate slot availability with doctor's user id
    const doctorProf = await doctorProfile.findOne({ where: { user_id: appointmentData.doctor_id } });
    if (!doctorProf) {
      return res.status(404).json({ error: "Doctor profile not found for this appointment" });
    }

    const doctorUserId = doctorProf.user_id;

    // Check slot availability
    const isAvailable = await checkSlotAvailability(doctorUserId, start, end, dateStr, type);
    if (!isAvailable) {
      return res.status(404).json({ error: "Slot is not available in doctor's schedule." });
    }

    // Check for conflicting appointments for doctor
    const isBooked = await checkAnotherAppointment(doctorUserId, dateStr, start, end);
    if (isBooked) {
      return res.status(409).json({ error: "Doctor already has an appointment at this slot." });
    }

    // =========================================================================
    // CHANGED: Pre-payment parameter check and validation
    // Before proceeding to create checkup or orders, ensure doctor & user models
    // contain all properties necessary for order generation.
    // =========================================================================
    let doctorUserObj = null;
    let userObj = null;

    if (isPaymentRequired) {
      if (doctorProf.kyc_status !== "verified") {
        return res.status(400).json({
          error: "Doctor is not eligible for receiving payments or KYC unverified."
        });
      }

      if (!doctorProf.consultation_fee || Number(doctorProf.consultation_fee) <= 0) {
        return res.status(400).json({
          error: "Doctor consultation fee is missing or invalid for paid checkup."
        });
      }

      doctorUserObj = await User.findByPk(doctorUserId);
      userObj = await User.findByPk(requesterUserId);

      if (!doctorUserObj || !userObj) {
        return res.status(400).json({
          error: "Incomplete user details: Patient or Doctor user record not found."
        });
      }

      if (!doctorUserObj.username || !doctorUserObj.email || !userObj.username || !userObj.email) {
        return res.status(400).json({
          error: "Required profile details missing (name/email) for generating the payment order."
        });
      }

      if (!req.body.payment_mode) {
        return res.status(400).json({
          error: "The appointment requires payment, but no payment_mode was provided in the request."
        });
      }
    }

    // Create checkupAppointment record
    const created = await checkupAppointment.create({
      user_id: requesterUserId,
      doctor_id: doctorProf.id,       
      appointment_id: appointment_id,
      checkup_date: requestedDate,
      checkup_start_time: start,
      checkup_end_time: end,
      checkup_status: checkupStatus,
      is_payment_required: isPaymentRequired
    });

    // =========================================================================
    // CHANGED: Create Razorpay Order via createOrder helper function
    // =========================================================================
    let orderDetails = null;
    if (isPaymentRequired) {
      const notes = {
        patientName: userObj.userName,
        patientEmail: userObj.email,
        doctorName: doctorUserObj.userName,
        doctorEmail: doctorUserObj.email,
        appointmentDate: dateStr,
        appointmentTime: `${start}-${end}`,
        appointmentId: appointment_id,
        checkupId: created.id,
        organisationId: doctorProf.organisation_id
      };

      // Call the createOrder function using the same signature as scheduleAppointment
      orderDetails = await createOrder(
        doctorProf.consultation_fee,
        appointment_id,
        doctorUserId,
        notes,
        req.body.payment_mode || 'card',
        doctorProf.organisation_id,
        requesterUserId
      );
    }

    // Remove the booked slot from doctorSlots (doctorUserId)
    let slotRecord = await doctorSlots.findOne({ where: { doctor_id: doctorUserId } });

    if (slotRecord) {
      let slotsData = [];
      try {
        let raw = slotRecord.slots;

        if (Buffer.isBuffer(raw)) raw = raw.toString();

        if (typeof raw === "string") {
          slotsData = JSON.parse(raw);
          if (typeof slotsData === "string") {
            slotsData = JSON.parse(slotsData);
          }
        } else if (Array.isArray(raw)) {
          slotsData = raw;
        } else {
          slotsData = [];
        }
      } catch (err) {
        // // logger && logger.error("Failed to parse doctorSlots.slots JSON:", err);
        slotRecord.slots = [];
        slotsData = [];
      }

      if (Array.isArray(slotsData)) {
        const updatedSlots = JSON.parse(JSON.stringify(slotsData)); 
        const dateIndex = updatedSlots.findIndex(s => s.date === dateStr);

        if (dateIndex !== -1) {
          const daySlots = updatedSlots[dateIndex].slots || [];
          const filteredDaySlots = daySlots.filter(slot => !(slot.start === start && slot.end === end));
          updatedSlots[dateIndex].slots = filteredDaySlots;

          await doctorSlots.update(
            { slots: updatedSlots },
            { where: { doctor_id: doctorUserId } }
          );
        }
      }
    }

    // =========================================================================
    // CHANGED: Spread order details into the response if payment was required
    // =========================================================================
    return res.status(200).json({
      message: "Checkup scheduled successfully",
      checkup: created,
      free: !isPaymentRequired,
      appointment_id: created.id,
      success: true,
      ...(orderDetails || {})
    });

  } catch (err) {
    // // logger && logger.error("scheduleCheckup error:", err);
    console.log("scheduleCheckup error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message || err.description || err });
  }
};

module.exports = scheduleCheckup;