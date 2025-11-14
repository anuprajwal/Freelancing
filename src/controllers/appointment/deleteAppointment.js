const { appointments, doctorSlots, doctorProfile } = require("../../../models");

const deleteAppointmentRestoreSlot = async (req, res) => {
  const { appointment_id } = req.query;

  if(!appointment_id){
    return res.status(400).json({error:"cant find field appointment_id in request"})
  }

  // Step 1: Find the appointment
  const appt = await appointments.findOne({
    where: {
      id: appointment_id,
      appointment_status: ['pending', 'confirmed']
    }
  });

  if (!appt) {
    return res.status(404).json({ error: "Appointment not found or not deletable." });
  }

  let { doctor_id, appointment_date, appointment_start_time, appointment_end_time } = appt;

  const doctor_profile_data = await doctorProfile.findOne({
    where:{
      id : doctor_id
    }
  })

  // Step 2: Delete the appointment
  await appointments.update(
    { appointment_status: "cancelled" },
    { where: { id: appointment_id } }
  );
  
  // Step 3: Add the slot back to doctorSlots
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id : doctor_profile_data.user_id } });

  console.log(appointment_start_time, appointment_end_time)
  const converted_date = appointment_date.toISOString().split('T')[0];

  if (slotRecord && Array.isArray(slotRecord.slots)) {
    const updatedSlots = [...slotRecord.slots];
    const dateIndex = updatedSlots.findIndex(s => s.date === converted_date);

    console.log(dateIndex)

    if (dateIndex !== -1) {
      const daySlots = updatedSlots[dateIndex].slots || [];


      // Prevent duplicate slot
      const isAlreadyThere = daySlots.some(slot =>
        slot.start === appointment_start_time && slot.end === appointment_end_time
      );

      console.log(isAlreadyThere)
      console.log(daySlots)

      if (!isAlreadyThere) {
        const [startHours, startMinutes] = appointment_start_time.split(":");
        const formattedAppointmmentStartTime = `${startHours}:${startMinutes}`;
        const [endHours, endMinutes] = appointment_end_time.split(":");
        const formattedAppointmmentEndTime = `${endHours}:${endMinutes}`;
        
        daySlots.push({
          start: formattedAppointmmentStartTime,
          end: formattedAppointmmentEndTime
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


  return res.status(200).json({
    message: "Appointment deleted. Slot restored. Related request (if any) removed."
  });
};

module.exports = deleteAppointmentRestoreSlot;
