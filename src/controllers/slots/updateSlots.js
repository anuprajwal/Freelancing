const { doctorSlots, appointments } = require('../models');
const { Op } = require('sequelize');

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function generateDaySlots(loginTime, logoutTime, breaks = [], slotDuration = 30) {
  const slots = [];
  let current = toMinutes(loginTime);
  const logout = toMinutes(logoutTime);

  const breakIntervals = breaks.map(b => {
    const [start, end] = b.split('-');
    return [toMinutes(start), toMinutes(end)];
  });

  while (current + slotDuration <= logout) {
    const slotStart = current;
    const slotEnd = current + slotDuration;

    const isInBreak = breakIntervals.some(
      ([bStart, bEnd]) => slotStart < bEnd && slotEnd > bStart
    );

    if (!isInBreak) {
      slots.push({
        start: formatTime(slotStart),
        end: formatTime(slotEnd),
      });
    }

    current += slotDuration;
  }

  return slots;
}

/**
 * Check existing appointments for a given date and override doctor slots if valid.
 */
const overrideDaySlotsIfAppointmentsFit = async ({
  doctor_id,
  date,
  loginTime,
  logoutTime,
  breaks = [],
  slotDuration = 30
}) => {
  const loginMin = toMinutes(loginTime);
  const logoutMin = toMinutes(logoutTime);
  const breakIntervals = breaks.map(b => {
    const [start, end] = b.split('-');
    return [toMinutes(start), toMinutes(end)];
  });

  // Step 1: Fetch existing appointments for the day
  
    const appointmentList = await appointments.findAll({
        where: {
        doctor_id,
        appointment_date: date,
        appointment_status: {
            [Op.in]: ['confirmed', 'pending']
        }
        }
    });

  // Step 2: Check appointment constraints
  for (const appt of appointmentList) {
    const apptStart = toMinutes(appt.start);
    const apptEnd = toMinutes(appt.end);

    if (apptStart < loginMin || apptEnd > logoutMin) {
      throw new Error(
        `Appointment from ${appt.start} to ${appt.end} is outside the new working hours.`
      );
    }

    const overlapsBreak = breakIntervals.some(([bStart, bEnd]) =>
      apptStart < bEnd && apptEnd > bStart
    );

    if (overlapsBreak) {
      throw new Error(
        `Appointment from ${appt.start} to ${appt.end} overlaps with the new break timings.`
      );
    }
  }

  // Step 3: Generate new slot list for the date
  const newSlotsForDay = generateDaySlots(loginTime, logoutTime, breaks, slotDuration);

  // Step 4: Fetch or insert doctorSlots record
  let slotRecord = await doctorSlots.findOne({ where: { doctor_id } });
  let updatedSlots = slotRecord?.slots || [];

  const existingIndex = updatedSlots.findIndex(s => s.date === date);
  if (existingIndex !== -1) {
    updatedSlots[existingIndex].slots = newSlotsForDay;
  } else {
    updatedSlots.push({ date, slots: newSlotsForDay });
  }

  if (slotRecord) {
    await doctorSlots.update(
      { slots: updatedSlots },
      { where: { doctor_id } }
    );
  } else {
    await doctorSlots.create({
      doctor_id,
      slots: [{ date, slots: newSlotsForDay }]
    });
  }

  return {
    message: "Override slots successfully updated",
    date,
    slots: newSlotsForDay
  };
};


const updateSlot = async(req, res)=>{
    const {id} = req.user.payload
    const {
        date,
        loginTime,
        logoutTime,
        breaks = [],
        slotDuration = 30
    } = req.body
    try{
        const result = overrideDaySlotsIfAppointmentsFit(id, date, loginTime, logoutTime, breaks, slotDuration)
        if (!result.message === "Override slots successfully updated"){
            return res.status(200).json({message:"succesfully updates the slots"})
        }
    }catch(e){
        return res.status(400).json({error:e})
    }

    


}


module.exports = updateSlot;
