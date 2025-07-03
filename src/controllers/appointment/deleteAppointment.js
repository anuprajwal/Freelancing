const { appointments, requestAppointments, doctorSlots } = require("../../../models");

const deleteAppointmentRestoreSlot = async (req, res) => {
  const { appointment_id } = req.params;

  // Step 1: Find the appointment
  const appt = await appointments.findOne({
    where: {
      id: appointment_id,
      status: ['pending', 'confirmed']
    }
  });

  if (!appt) {
    return res.status(404).json({ error: "Appointment not found or not deletable." });
  }

  const { doctor_id, user_id, appointment_date, appointment_start_time, appointment_end_time } = appt;

  // Step 2: Delete the appointment
  await appointments.destroy({ where: { id: appointment_id } });

  // Step 3: Add the slot back to doctorSlots
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });

  if (slotRecord && Array.isArray(slotRecord.slots)) {
    const updatedSlots = [...slotRecord.slots];
    const dateIndex = updatedSlots.findIndex(s => s.date === appointment_date);

    if (dateIndex !== -1) {
      const daySlots = updatedSlots[dateIndex].slots || [];

      // Prevent duplicate slot
      const isAlreadyThere = daySlots.some(slot =>
        slot.start === appointment_start_time && slot.end === appointment_end_time
      );

      if (!isAlreadyThere) {
        daySlots.push({
          start: appointment_start_time,
          end: appointment_end_time
        });

        // Sort slots again in time order
        daySlots.sort((a, b) => a.start.localeCompare(b.start));

        updatedSlots[dateIndex].slots = daySlots;

        await doctorSlots.update(
          { slots: updatedSlots },
          { where: { doctor_id } }
        );
      }
    }
  }

  // Step 4: Delete related requestAppointment if exists
  await requestAppointments.destroy({
    where: {
      user_id,
      doctor_id,
      original_date: appointment_date
    }
  });

  return res.status(200).json({
    message: "Appointment deleted. Slot restored. Related request (if any) removed."
  });
};

module.exports = deleteAppointmentRestoreSlot;
