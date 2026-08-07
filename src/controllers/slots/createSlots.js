// const { doctorSlots } = require("../../../models");

// function toMinutes(timeStr) {
//   const [h, m] = timeStr.split(":").map(Number);
//   return h * 60 + m;
// }

// function formatTime(minutes) {
//   const h = Math.floor(minutes / 60).toString().padStart(2, "0");
//   const m = (minutes % 60).toString().padStart(2, "0");
//   return `${h}:${m}`;
// }

// function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
//   const weekSlots = [];

//   for (let i = 0; i < 30; i++) {
//     const date = new Date();
//     date.setDate(date.getDate() + i);

//     const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
//     const dayName = date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

//     const daySchedule = weeklySchedule.find(d => d.day?.toLowerCase() === dayName);

//     const appointment_mode = daySchedule.mode

//     console.log(appointment_mode)

//     if (appointment_mode !== "online" && appointment_mode !== "offline" && appointment_mode !== "hybrid" && appointment_mode !== ""){
//       return {error:"appointment mode is not acceptable"}
//     }

//     // Fallback: no schedule or incomplete
//     if (!daySchedule || !daySchedule.loginTime || !daySchedule.logoutTime) {
//       weekSlots.push({
//         date: dateString,
//         day: dayName,
//         mode : appointment_mode,
//         slots: []
//       });
//       continue;
//     }

//     let login, logout;
//     try {
//       login = toMinutes(daySchedule.loginTime);
//       logout = toMinutes(daySchedule.logoutTime);
//     } catch {
//       weekSlots.push({
//         date: dateString,
//         day: dayName,
//         mode : appointment_mode,
//         slots: []
//       });
//       continue;
//     }

//     const breakIntervals = Array.isArray(daySchedule.breaks)
//       ? daySchedule.breaks.map(b => {
//           const [start, end] = b.split("-");
//           return [toMinutes(start), toMinutes(end)];
//         })
//       : [];

//     const slots = [];
//     let current = login;

//     while (current + slotDurationMinutes <= logout) {
//       const slotStart = current;
//       const slotEnd = current + slotDurationMinutes;

//       const isInBreak = breakIntervals.some(
//         ([bStart, bEnd]) => slotStart < bEnd && slotEnd > bStart
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
//       mode : appointment_mode,
//       slots
//     });
//   }

//   console.log(weekSlots)

//   return weekSlots;
// }

// const createOrMergeDoctorSlots = async (doctor_id, weeklySchedule, slotDurationMinutes = 30) => {
//   const newGenerated = generateWeeklySlots(weeklySchedule, slotDurationMinutes);

//   console.log("printing slots before main:",newGenerated)

//   if (newGenerated.error === "appointment mode is not acceptable"){
//     return {error: "appointment mode is not acceptable"}
//   }

//   const existing = await doctorSlots.findOne({ where: { doctor_id } });


//   if (!existing) {
//     await doctorSlots.create({
//       doctor_id,
//       slots: newGenerated
//     });
//     return { message: "Slots created for next 7 days." };
//   }

//   let existingSlots = [];

//   if (existing && existing.slots) {
//     if (Array.isArray(existing.slots)) {
//       existingSlots = existing.slots;
//     } else if (typeof existing.slots === 'string') {
//       try {
//         const parsed = JSON.parse(existing.slots);
//         if (Array.isArray(parsed)) existingSlots = parsed;
//       } catch (err) {
//         console.error('Could not parse slots JSON:', err);
//       }
//     } else if (typeof existing.slots === 'object') {
//       existingSlots = Object.values(existing.slots);
//     }
//   }


//   for (const newDay of newGenerated) {
//     const existingDay = existingSlots.find(d => d.date === newDay.date);

//     if (!existingDay) {
//       existingSlots.push(newDay);
//     } else {
//       const existingTimeStrings = new Set(
//         existingDay.slots.map(s => `${s.start}-${s.end}`)
//       );

//       for (const newSlot of newDay.slots) {
//         const key = `${newSlot.start}-${newSlot.end}`;
//         if (!existingTimeStrings.has(key)) {
//           existingDay.slots.push(newSlot);
//         }
//       }

//       existingDay.slots.sort((a, b) => a.start.localeCompare(b.start));
//     }
//   }

//   await doctorSlots.update({ slots: existingSlots }, { where: { doctor_id } });

//   return { message: "New slots merged with existing ones." };
// };

// module.exports = createOrMergeDoctorSlots;



const { doctorSlots } = require("../../../models");

function toMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatTime(minutes) {
  // Normalize minutes within a 24-hour day (0 to 1439)
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalizedMinutes / 60).toString().padStart(2, "0");
  const m = (normalizedMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
  const weekSlots = [];
  const validModes = new Set(["online", "offline", "hybrid", ""]);

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const dayName = date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

    const daySchedule = weeklySchedule.find(d => d.day?.toLowerCase() === dayName);
    const appointment_mode = daySchedule?.mode || "";

    if (!validModes.has(appointment_mode)) {
      return { error: "appointment mode is not acceptable" };
    }

    // Skip slot generation if schedule is incomplete
    if (!daySchedule || !daySchedule.loginTime || !daySchedule.logoutTime) {
      weekSlots.push({
        date: dateString,
        day: dayName,
        mode: appointment_mode,
        slots: []
      });
      continue;
    }

    let login = toMinutes(daySchedule.loginTime);
    let logout = toMinutes(daySchedule.logoutTime);

    if (login === null || logout === null) {
      weekSlots.push({
        date: dateString,
        day: dayName,
        mode: appointment_mode,
        slots: []
      });
      continue;
    }

    // Handle overnight shifts (e.g., Login 21:42, Logout 06:42 next day)
    if (logout <= login) {
      logout += 24 * 60; // Add 24 hours in minutes
    }

    const breakIntervals = Array.isArray(daySchedule.breaks)
      ? daySchedule.breaks
          .map(b => {
            const [start, end] = b.split("-");
            let bStart = toMinutes(start);
            let bEnd = toMinutes(end);
            if (bStart === null || bEnd === null) return null;
            // Adjust break times if they cross midnight or fall after login
            if (bStart < login && bEnd < login) {
              bStart += 24 * 60;
              bEnd += 24 * 60;
            }
            return [bStart, bEnd];
          })
          .filter(Boolean)
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
      mode: appointment_mode,
      slots
    });
  }

  return weekSlots;
}

const createOrMergeDoctorSlots = async (doctor_id, weeklySchedule, slotDurationMinutes = 30) => {
  const newGenerated = generateWeeklySlots(weeklySchedule, slotDurationMinutes);

  if (newGenerated.error) {
    return { error: newGenerated.error };
  }

  const existing = await doctorSlots.findOne({ where: { doctor_id } });

  if (!existing) {
    await doctorSlots.create({
      doctor_id,
      slots: newGenerated
    });
    return { message: "Slots created for next 30 days." };
  }

  let existingSlots = [];
  if (existing.slots) {
    if (Array.isArray(existing.slots)) {
      existingSlots = existing.slots;
    } else if (typeof existing.slots === "string") {
      try {
        const parsed = JSON.parse(existing.slots);
        if (Array.isArray(parsed)) existingSlots = parsed;
      } catch (err) {
        console.error("Could not parse slots JSON:", err);
      }
    } else if (typeof existing.slots === "object") {
      existingSlots = Object.values(existing.slots);
    }
  }

  for (const newDay of newGenerated) {
    const existingDay = existingSlots.find(d => d.date === newDay.date);

    if (!existingDay) {
      existingSlots.push(newDay);
    } else {
      // FIX: Ensure mode gets updated if specified in the new schedule
      if (newDay.mode) {
        existingDay.mode = newDay.mode;
      }

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