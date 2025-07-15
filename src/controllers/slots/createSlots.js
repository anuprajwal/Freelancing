// function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
//   const weekSlots = [];

//   for (let i = 0; i < 7; i++) {
//     const date = new Date();
//     date.setDate(date.getDate() + i);

//     const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
//     const dayName = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase(); // "monday", etc.

//     const daySchedule = weeklySchedule.find(d => d.day.toLowerCase() === dayName);

//     if (!daySchedule) {
//       // No availability for this day
//       weekSlots.push({
//         date: dateString,
//         day: dayName,
//         slots: []
//       });
//       continue;
//     }

//     const { loginTime, logoutTime, breaks } = daySchedule;

//     const login = toMinutes(loginTime);
//     const logout = toMinutes(logoutTime);
//     const breakIntervals = (breaks || []).map(b => {
//       const [start, end] = b.split('-');
//       return [toMinutes(start), toMinutes(end)];
//     });

//     const slots = [];
//     let current = login;
//     while (current + slotDurationMinutes <= logout) {
//       const slotStart = current;
//       const slotEnd = current + slotDurationMinutes;

//       const isInBreak = breakIntervals.some(
//         ([breakStart, breakEnd]) =>
//           slotStart < breakEnd && slotEnd > breakStart
//       );

//       if (!isInBreak) {
//         slots.push({
//           start: formatTime(slotStart),
//           end: formatTime(slotEnd)
//         });
//       }

//       current += slotDurationMinutes;
//     }

//     weekSlots.push({
//       date: dateString,
//       day: dayName,
//       slots
//     });
//   }

//   return weekSlots;
// }

// function toMinutes(timeStr) {
//   const [h, m] = timeStr.split(':').map(Number);
//   return h * 60 + m;
// }

// function formatTime(minutes) {
//   const h = Math.floor(minutes / 60).toString().padStart(2, '0');
//   const m = (minutes % 60).toString().padStart(2, '0');
//   return `${h}:${m}`;
// }

// module.exports = generateWeeklySlots;


const { doctorSlots } = require("../../../models");

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
  const weekSlots = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const dayName = date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

    const daySchedule = weeklySchedule.find(d => d.day?.toLowerCase() === dayName);

    // Fallback: no schedule or incomplete
    if (!daySchedule || !daySchedule.loginTime || !daySchedule.logoutTime) {
      weekSlots.push({
        date: dateString,
        day: dayName,
        slots: []
      });
      continue;
    }

    let login, logout;
    try {
      login = toMinutes(daySchedule.loginTime);
      logout = toMinutes(daySchedule.logoutTime);
    } catch {
      weekSlots.push({
        date: dateString,
        day: dayName,
        slots: []
      });
      continue;
    }

    const breakIntervals = Array.isArray(daySchedule.breaks)
      ? daySchedule.breaks.map(b => {
          const [start, end] = b.split("-");
          return [toMinutes(start), toMinutes(end)];
        })
      : [];

    const slots = [];
    let current = login;

    while (current + slotDurationMinutes <= logout) {
      const slotStart = current;
      const slotEnd = current + slotDurationMinutes;

      const isInBreak = breakIntervals.some(
        ([bStart, bEnd]) => slotStart < bEnd && slotEnd > bStart
      );

      if (!isInBreak) {
        slots.push({
          start: formatTime(slotStart),
          end: formatTime(slotEnd)
        });
      }

      current += slotDurationMinutes;
    }

    weekSlots.push({
      date: dateString,
      day: dayName,
      slots
    });
  }

  return weekSlots;
}

const createOrMergeDoctorSlots = async (doctor_id, weeklySchedule, slotDurationMinutes = 30) => {
  const newGenerated = generateWeeklySlots(weeklySchedule, slotDurationMinutes);

  const existing = await doctorSlots.findOne({ where: { doctor_id } });


  if (!existing) {
    await doctorSlots.create({
      doctor_id,
      slots: newGenerated
    });
    return { message: "Slots created for next 7 days." };
  }

  let existingSlots = [];

  if (existing && existing.slots) {
    if (Array.isArray(existing.slots)) {
      existingSlots = existing.slots;
    } else if (typeof existing.slots === 'string') {
      try {
        const parsed = JSON.parse(existing.slots);
        if (Array.isArray(parsed)) existingSlots = parsed;
      } catch (err) {
        console.error('Could not parse slots JSON:', err);
      }
    } else if (typeof existing.slots === 'object') {
      existingSlots = Object.values(existing.slots);
    }
  }


  for (const newDay of newGenerated) {
    const existingDay = existingSlots.find(d => d.date === newDay.date);

    if (!existingDay) {
      existingSlots.push(newDay);
    } else {
      const existingTimeStrings = new Set(
        existingDay.slots.map(s => `${s.start}-${s.end}`)
      );

      for (const newSlot of newDay.slots) {
        const key = `${newSlot.start}-${newSlot.end}`;
        if (!existingTimeStrings.has(key)) {
          existingDay.slots.push(newSlot);
        }
      }

      existingDay.slots.sort((a, b) => a.start.localeCompare(b.start));
    }
  }

  await doctorSlots.update({ slots: existingSlots }, { where: { doctor_id } });

  return { message: "New slots merged with existing ones." };
};

module.exports = createOrMergeDoctorSlots;
