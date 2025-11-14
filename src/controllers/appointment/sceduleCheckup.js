const { appointments, doctorSlots, checkupAppointment, doctorProfile } = require('../../../models');
const checkSlotAvailability = require("../slots/checkSlots");
const checkAnotherAppointment = require("../slots/checkAppointmentAvailability");
require("dotenv").config();


const scheduleCheckup = async (req, res) => {
  const { appointment_id } = req.body
  const { date } = req.body
  const appointment_data = await appointments.findByPk(appointment_id)

  if (!appointment_data){
    return res.status(404).json({error:"couldnot find the previous appointment"})
  }

  if (!appointment_data.appointment_status === "closed"){
    return res.status(400).json({error:"the specified appointment is not yet complete"})
  }


  const converted_date = appointment_data.appointment_date.toISOString().split('T')[0];
  const formattedToday = date.toISOString().split('T')[0];
  console.log("Today's date:", formattedToday);


  formattedToday.setHours(0, 0, 0, 0);
  converted_date.setHours(0, 0, 0, 0);

  const diffTime = converted_date - formattedToday;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  console.log(`Difference: ${diffDays} day(s)`);

  if (diffDays < -2) {
    await paymentRedirection(req)
    return res.status(200).json({message:"appointment scheduled succesfully"})
  }else{
    commonflow1(req, "confirmed")
  }
  

  return res.status(200).json({message:"your appointment is confirmed"})
};




const paymentRedirection = async (req)=>{
  const {payment_mode} = req.body

  if (payment_mode === "offline" && type.includes("online")){
    return res.status(400).json({error:"online appointment cant have offline payment"})
  }

  if (!['online', 'offline'].includes(payment_mode)){
    return res.status(400).json({error:"cant find relevant value in payment mode"})
  }

  commonflow1(req, "pending")

  return true
}





const commonflow1 = async (req, status)=>{
  const {date, start, end, type} = req.body

  const doctorObj = await doctorProfile.findOne({where:{id:req.body.doctor_id}})

  if (!doctorObj){
    return res.status(404).json({error:"cant find the doctor, user wants to find"})
  }

  const doctor_id = doctorObj.user_id

  if (!['online_video','online_audio','offline'].includes(type)){
    return res.status(400).json({error:"appointment type is not valid"})
  }

  const isAvailable = await checkSlotAvailability(doctor_id, start, end, date, type);
  if (!isAvailable) {
    return res.status(404).json({message:"Slot is not available in doctor's schedule."})
  }

  const isBooked = await checkAnotherAppointment(doctor_id, date, start, end);
  if (isBooked) {
    throw new Error("Doctor already has an appointment at this slot.");
  }

  await checkupAppointment.create({
    user_id: req.user.payload.id,
    doctor_id : doctorObj.id,
    appointment_id : req.body.appointment_id,
    checkup_date: date,
    checkup_start_time:start,
    checkup_end_time:end,
    checkup_status: status,
    is_payment_required: status === "pending"? true : false
  });

  let slotRecord = await doctorSlots.findOne({ where: { doctor_id } });

  if (slotRecord && !Array.isArray(slotRecord.slots)){
    try {
      slotRecord.slots = JSON.parse(slotRecord.slots);
    } catch (err) {
      console.error("Invalid slots JSON string:", err);
      slotRecord.slots = []; // Fallback
    }
  }

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

  return true
}


module.exports = scheduleCheckup;
