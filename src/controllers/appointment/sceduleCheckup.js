const { appointments, doctorSlots, requestAppointments } = require('../../../models');
const moment = require("moment");

const scheduleCheckup = async ({ doctor_id, appointment_id, daysToAdd }) => {
  // 1. Get existing appointment
  const appt = await appointments.findOne({ where: { id: appointment_id, doctor_id } });
  if (!appt) throw new Error("Appointment not found.");

  const { user_id, appointment_date } = appt;
  const newDate = moment(appointment_date).add(daysToAdd, 'days').format('YYYY-MM-DD');

  // 2. Check for slots on the new date
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });
  const slotsForDate = slotRecord?.slots?.find(s => s.date === newDate);
  const availableSlots = slotsForDate?.slots || [];

  if (availableSlots.length === 0) {
    // 3. If no slots → create request
    await requestAppointments.create({
      user_id,
      doctor_id,
      original_date: appointment_date,
      requested_date: newDate,
      start: null,
      end: null,
      status: 'pending'
    });

    return {
      status: "requested",
      message: `No slots on ${newDate}. Appointment request recorded.`
    };
  }

  // 4. Slot available → Book first slot
  const firstSlot = availableSlots[0];

  await appointments.create({
    user_id,
    doctor_id,
    appointment_date: newDate,
    appointment_start_time: firstSlot.start,
    appointment_end_time: firstSlot.end,
    status: "pending"
  });

  // 5. Remove slot from doctorSlots
  const updatedDaySlots = availableSlots.filter(slot =>
    !(slot.start === firstSlot.start && slot.end === firstSlot.end)
  );
  const newSlotsList = [...slotRecord.slots];
  const dateIndex = newSlotsList.findIndex(s => s.date === newDate);
  newSlotsList[dateIndex].slots = updatedDaySlots;

  await doctorSlots.update({ slots: newSlotsList }, { where: { doctor_id } });

  return {
    status: "booked",
    message: `Appointment rescheduled to ${newDate} at ${firstSlot.start} - ${firstSlot.end}.`,
    date: newDate,
    slot: firstSlot
  };
};

module.exports = scheduleCheckup;
