const { appointments, doctorProfile, doctorSlots } = require("../../../models");
const { Op } = require("sequelize");
const logger = require("../../../logger");
const checkSlotAvailability = require("../slots/checkSlots");
const checkAnotherAppointment = require("../slots/checkAppointmentAvailability");

const scheduleAppointment = async (req, res) => {
  try{
    const { doctor_id, date, start, end, type, payment_mode } = req.body

  const doctorObj = await doctorProfile.findOne({where:{user_id:doctor_id}})

  if (!doctorObj){
    return res.status(404).json({error:"cant find the doctor, user wants to find"})
  }

  if (payment_mode === "offline" && type.includes("online")){
    return res.status(400).json({error:"online appointment cant have offline payment"})
  }

  if (!['online_video','online_audio','offline'].includes(type)){
    return res.status(400).json({error:"appointment type is not valid"})
  }

  if (!['online', 'offline'].includes(payment_mode)){
    return res.status(400).json({error:"cant find relevant value in payment mode"})
  }

  // Step 1: Check if the slot is in the doctor's available slots
  const isAvailable = await checkSlotAvailability(doctor_id, start, end, date, type);
  if (!isAvailable) {
    return res.status(404).json({message:"Slot is not available in doctor's schedule."})
  }

  // Step 2: Check if the doctor already has an appointment at that exact slot
  const isBooked = await checkAnotherAppointment(doctor_id, date, start, end);
  if (isBooked) {
    throw new Error("Doctor already has an appointment at this slot.");
  }

  // Step 3: Proceed to confirm the appointment
  const createdAppointment = await appointments.create({
    user_id: req.user.payload.id,
    doctor_id : doctorObj.id,
    appointment_date: date,
    appointment_start_time:start,
    appointment_end_time:end,
    status: "pending",
    payment_mode
  });

  // Step 4: Remove the booked slot from doctorSlots
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });

  if (slotRecord && Array.isArray(slotRecord.slots)) {
    let slots;
    if (typeof slotRecord.slots === "string"){
      slots = JSON.parse(slotRecord.slots);
    }else{
      slots = slotRecord.slots
    }
    const updatedSlots = [...slots]; // deep copy
    const dateIndex = updatedSlots.findIndex(s => s.date === date);

    if (dateIndex !== -1) {
      const daySlots = updatedSlots[dateIndex].slots || [];

      // Remove the slot that matches {start, end}
      const filteredDaySlots = daySlots.filter(slot => !(slot.start === start && slot.end === end));

      updatedSlots[dateIndex].slots = filteredDaySlots;

      console.log("updated data:", updatedSlots)

      await doctorSlots.update(
        { slots: updatedSlots },
        { where: { doctor_id } }
      );
    }
  }


  return res.status(200).json({message:"appointment scheduled", createdAppointment})
  }catch(Error){
    return res.status(400).json({error:Error.message})
  }
  
}

module.exports = scheduleAppointment