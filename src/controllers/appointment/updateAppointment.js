const { appointments, doctorSlots } = require("../../../models");
const checkSlotAvailability = require("../slots/checkSlots");

const reschedulePendingAppointment = async (req, res) => {
  const { appointment_id, newDate, newStart, newEnd, appointment_type } = req.body;

  // Step 1: Find the original appointment
  const oldAppointment = await appointments.findOne({
    where: {
      id: appointment_id,
      appointment_status: "pending"
    }
  });

  if (!oldAppointment) {
    return res.status(404).json({ error: "Pending appointment not found." });
  }

  let {
    doctor_id,
    appointment_date,
    appointment_start_time,
    appointment_end_time
  } = oldAppointment;

  // Step 2: Check new slot availability
  const isSlotAvailable = await checkSlotAvailability(doctor_id, newStart, newEnd, newDate, appointment_type);
  if (!isSlotAvailable) {
    return res.status(400).json({ error: "The new slot is not available." });
  }

  // Step 3: Fetch existing doctor slots
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });

  if (!slotRecord || !Array.isArray(slotRecord.slots)) {
    return res.status(500).json({ error: "Doctor slot record not found or invalid." });
  }

  const updatedSlots = [...slotRecord.slots];

  const converted_date = appointment_date.toISOString().split('T')[0];
  let formattedAppointmmentStartTime, formattedAppointmmentEndTime

  // Step 3.1: Restore old slot
  const oldDateIndex = updatedSlots.findIndex(s => s.date === converted_date);
  if (oldDateIndex !== -1) {
    if (!Array.isArray(updatedSlots[oldDateIndex].slots)) {
      updatedSlots[oldDateIndex].slots = [];
    }

    const [startHours, startMinutes] = appointment_start_time.split(":");
    formattedAppointmmentStartTime = `${startHours}:${startMinutes}`;
    const [endHours, endMinutes] = appointment_end_time.split(":");
    formattedAppointmmentEndTime = `${endHours}:${endMinutes}`;

    const slotExists = updatedSlots[oldDateIndex].slots.some(
      slot => slot.start === formattedAppointmmentStartTime && slot.end === formattedAppointmmentEndTime
    );

    if (!slotExists) {
      updatedSlots[oldDateIndex].slots.push({
        start: formattedAppointmmentStartTime,
        end: formattedAppointmmentEndTime
      });

      // Optional: sort by time
      updatedSlots[oldDateIndex].slots.sort((a, b) => a.start.localeCompare(b.start));
    }
  } else {
    // If no entry for old date, add a new one
    updatedSlots.push({
      date: converted_date,
      slots: [
        {
          start: formattedAppointmmentStartTime,
          end: formattedAppointmmentEndTime
        }
      ]
    });
  }

  // Step 3.2: Remove the new slot from schedule
  const newDateIndex = updatedSlots.findIndex(s => s.date === newDate);
  if (newDateIndex !== -1 && Array.isArray(updatedSlots[newDateIndex].slots)) {
    updatedSlots[newDateIndex].slots = updatedSlots[newDateIndex].slots.filter(
      slot => !(slot.start === newStart && slot.end === newEnd)
    );
  }

  // Step 4: Update doctorSlots in DB
  await doctorSlots.update(
    { slots: updatedSlots },
    { where: { doctor_id } }
  );

  // Step 5: Update the appointment
  await appointments.update(
    {
      appointment_date: newDate,
      appointment_start_time: newStart,
      appointment_end_time: newEnd
    },
    {
      where: { id: appointment_id }
    }
  );

  return res.status(200).json({ message: "Appointment rescheduled successfully." });
};

module.exports = reschedulePendingAppointment;
