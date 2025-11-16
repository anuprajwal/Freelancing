// const { appointments, doctorSlots, checkupAppointment, doctorProfile } = require('../../../models');
// const checkSlotAvailability = require("../slots/checkSlots");
// const checkAnotherAppointment = require("../slots/checkAppointmentAvailability");
// require("dotenv").config();


// const scheduleCheckup = async (req, res) => {
//   const { appointment_id } = req.body
//   const { date } = req.body
//   const appointment_data = await appointments.findByPk(appointment_id)

//   if (!appointment_data){
//     return res.status(404).json({error:"couldnot find the previous appointment"})
//   }

//   if (!appointment_data.appointment_status === "closed"){
//     return res.status(400).json({error:"the specified appointment is not yet complete"})
//   }


//   const converted_date = appointment_data.appointment_date.toISOString().split('T')[0];
//   const formattedToday = date.toISOString().split('T')[0];
//   console.log("Today's date:", formattedToday);


//   formattedToday.setHours(0, 0, 0, 0);
//   converted_date.setHours(0, 0, 0, 0);

//   const diffTime = converted_date - formattedToday;
//   const diffDays = diffTime / (1000 * 60 * 60 * 24);

//   console.log(`Difference: ${diffDays} day(s)`);

//   if (diffDays < -2) {
//     await paymentRedirection(req)
//     return res.status(200).json({message:"appointment scheduled succesfully"})
//   }else{
//     commonflow1(req, "confirmed")
//   }
  

//   return res.status(200).json({message:"your appointment is confirmed"})
// };




// const paymentRedirection = async (req)=>{
//   const {payment_mode} = req.body

//   if (payment_mode === "offline" && type.includes("online")){
//     return res.status(400).json({error:"online appointment cant have offline payment"})
//   }

//   if (!['online', 'offline'].includes(payment_mode)){
//     return res.status(400).json({error:"cant find relevant value in payment mode"})
//   }

//   commonflow1(req, "pending")

//   return true
// }





// const commonflow1 = async (req, status)=>{
//   const {date, start, end, type} = req.body

//   const doctorObj = await doctorProfile.findOne({where:{id:req.body.doctor_id}})

//   if (!doctorObj){
//     return res.status(404).json({error:"cant find the doctor, user wants to find"})
//   }

//   const doctor_id = doctorObj.user_id

//   if (!['online_video','online_audio','offline'].includes(type)){
//     return res.status(400).json({error:"appointment type is not valid"})
//   }

//   const isAvailable = await checkSlotAvailability(doctor_id, start, end, date, type);
//   if (!isAvailable) {
//     return res.status(404).json({message:"Slot is not available in doctor's schedule."})
//   }

//   const isBooked = await checkAnotherAppointment(doctor_id, date, start, end);
//   if (isBooked) {
//     throw new Error("Doctor already has an appointment at this slot.");
//   }

//   await checkupAppointment.create({
//     user_id: req.user.payload.id,
//     doctor_id : doctorObj.id,
//     appointment_id : req.body.appointment_id,
//     checkup_date: date,
//     checkup_start_time:start,
//     checkup_end_time:end,
//     checkup_status: status,
//     is_payment_required: status === "pending"? true : false
//   });

//   let slotRecord = await doctorSlots.findOne({ where: { doctor_id } });

//   if (slotRecord && !Array.isArray(slotRecord.slots)){
//     try {
//       slotRecord.slots = JSON.parse(slotRecord.slots);
//     } catch (err) {
//       console.error("Invalid slots JSON string:", err);
//       slotRecord.slots = []; // Fallback
//     }
//   }

//   if (slotRecord && Array.isArray(slotRecord.slots)) {
//     let slots;
//     if (typeof slotRecord.slots === "string"){
//       slots = JSON.parse(slotRecord.slots);
//     }else{
//       slots = slotRecord.slots
//     }
//     const updatedSlots = [...slots]; // deep copy

//     const dateIndex = updatedSlots.findIndex(s => s.date === date);

//     if (dateIndex !== -1) {
//       const daySlots = updatedSlots[dateIndex].slots || [];

//       // Remove the slot that matches {start, end}
//       const filteredDaySlots = daySlots.filter(slot => !(slot.start === start && slot.end === end));

//       updatedSlots[dateIndex].slots = filteredDaySlots;

//       console.log("updated data:", updatedSlots)

//       await doctorSlots.update(
//         { slots: updatedSlots },
//         { where: { doctor_id } }
//       );
//     }
//   }

//   return true
// }


// module.exports = scheduleCheckup;





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

/**
 * scheduleCheckup
 * Request body expected:
 * {
 *   appointment_id: number,
 *   date: "YYYY-MM-DD" (string) OR ISO string,
 *   start: "HH:MM" (string),
 *   end: "HH:MM" (string),
 *   type: "online_video" | "online_audio" | "offline"
 * }
 */
const scheduleCheckup = async (req, res) => {
  try {
    const { appointment_id, date: dateStr, start, end, type, payment_mode } = req.body;
    const requesterUserId = req.user.payload.id;

    // Basic validation
    if (!appointment_id || !dateStr || !start || !end || !type) {
      return res.status(400).json({ error: "appointment_id, date, start, end and type are required" });
    }

    if (!['online_video','online_audio','offline'].includes(type)) {
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
    const existing = await checkupAppointment.findOne({
      where: {
        appointment_id: appointment_id,
        checkup_status: ['pending', 'confirmed', 'completed'] // Sequelize will accept array? use Op.in if needed
      }
    });

    // Sequelize `where` with array needs Op.in; handle both
    if (!existing) {
      // fallback: explicit query using Op
      const { Op } = require('sequelize');
      const existing2 = await checkupAppointment.findOne({
        where: {
          appointment_id,
          checkup_status: { [Op.in]: ['pending', 'confirmed', 'completed'] }
        }
      });
      if (existing2) {
        return res.status(400).json({ error: "A follow-up checkup already exists for this appointment" });
      }
    } else {
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
    // Get doctorProfile for this appointment's doctor (doctorProfile.doctor_user id is doctor user id)
    const doctorProf = await doctorProfile.findOne({ where: { user_id: appointmentData.doctor_id } });
    if (!doctorProf) {
      return res.status(404).json({ error: "Doctor profile not found for this appointment" });
    }

    // doctorSlots uses doctor_id as user_id (based on your scheduleAppointment implementation)
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

    // Create checkupAppointment
    const created = await checkupAppointment.create({
      user_id: requesterUserId,
      doctor_id: doctorProf.id,       // doctorProfile.id (model expects doctor_profiles.id)
      appointment_id: appointment_id,
      checkup_date: requestedDate,
      checkup_start_time: start,
      checkup_end_time: end,
      checkup_status: checkupStatus,
      is_payment_required: isPaymentRequired
    });

    // If payment required (>15 days), create a payment entry (optional fields set)
    let paymentRecord = null;
    if (isPaymentRequired) {
      // derive payment amount from doctor profile (consultation_fee) if present
      const amount = doctorProf.consultation_fee || 0;

      // create a payment row; adapt fields to your payments model
      paymentRecord = await payments.create({
        user_id: requesterUserId,
        appointment_id: appointment_id,
        checkup_id: created.id,
        payment_status: "pending",
        payment_date: new Date(),
        payment_amount: amount,
        payment_method: payment_mode || 'online', // prefer incoming payment_mode else default
        organisation_id: doctorProf.organisation_id || null,
        payment_notes: JSON.stringify({
          note: "Follow-up checkup scheduled beyond free window",
          appointmentId: appointment_id,
          checkupId: created.id
        })
      });
    }

    // Remove the booked slot from doctorSlots (doctorUserId)
    let slotRecord = await doctorSlots.findOne({ where: { doctor_id: doctorUserId } });

    if (slotRecord) {
      // normalize slots into array
      let slotsData = [];
      try {
        let raw = slotRecord.slots;

        // handle Buffer (some setups)
        if (Buffer.isBuffer(raw)) raw = raw.toString();

        if (typeof raw === "string") {
          slotsData = JSON.parse(raw);
          // handle double-encoded
          if (typeof slotsData === "string") {
            slotsData = JSON.parse(slotsData);
          }
        } else if (Array.isArray(raw)) {
          slotsData = raw;
        } else {
          slotsData = [];
        }
      } catch (err) {
        logger && logger.error("Failed to parse doctorSlots.slots JSON:", err);
        slotRecord.slots = [];
        slotsData = [];
      }

      if (Array.isArray(slotsData)) {
        const updatedSlots = JSON.parse(JSON.stringify(slotsData)); // deep copy
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

    // Success response
    return res.status(200).json({
      message: "Checkup scheduled successfully",
      checkup: created,
      payment: paymentRecord ? { id: paymentRecord.id, status: paymentRecord.payment_status } : null,
      free: !isPaymentRequired
    });

  } catch (err) {
    logger && logger.error("scheduleCheckup error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

module.exports = scheduleCheckup;
