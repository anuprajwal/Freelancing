// function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
//     const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
//     const weekSlots = [];
  
//     for (const dayName of daysOfWeek) {
//       const daySchedule = weeklySchedule.find(d => d.day.toLowerCase() === dayName.toLowerCase());
  
//       if (!daySchedule) {
//         // No schedule provided for this day → empty slot list
//         weekSlots.push([]);
//         continue;
//       }
  
//       const { loginTime, logoutTime, breaks } = daySchedule;
  
//       const slots = [];
//       const login = toMinutes(loginTime);
//       const logout = toMinutes(logoutTime);
//       const breakIntervals = (breaks || []).map(b => {
//         const [start, end] = b.split('-');
//         return [toMinutes(start), toMinutes(end)];
//       });
  
//       let current = login;
//       while (current + slotDurationMinutes <= logout) {
//         const slotStart = current;
//         const slotEnd = current + slotDurationMinutes;
  
//         const isInBreak = breakIntervals.some(
//           ([breakStart, breakEnd]) =>
//             slotStart < breakEnd && slotEnd > breakStart
//         );
  
//         if (!isInBreak) {
//           slots.push({
//             day: dayName,
//             start: formatTime(slotStart),
//             end: formatTime(slotEnd)
//           });
//         }
  
//         current += slotDurationMinutes;
//       }
  
//       weekSlots.push(slots);
//     }
  
//     return weekSlots;
//   }
  
//   function toMinutes(timeStr) {
//     const [h, m] = timeStr.split(':').map(Number);
//     return h * 60 + m;
//   }
  
//   function formatTime(minutes) {
//     const h = Math.floor(minutes / 60).toString().padStart(2, '0');
//     const m = (minutes % 60).toString().padStart(2, '0');
//     return `${h}:${m}`;
//   }
  
// module.exports = generateWeeklySlots




function generateWeeklySlots(weeklySchedule, slotDurationMinutes = 30) {
  const weekSlots = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayName = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase(); // "monday", etc.

    const daySchedule = weeklySchedule.find(d => d.day.toLowerCase() === dayName);

    if (!daySchedule) {
      // No availability for this day
      weekSlots.push({
        date: dateString,
        day: dayName,
        slots: []
      });
      continue;
    }

    const { loginTime, logoutTime, breaks } = daySchedule;

    const login = toMinutes(loginTime);
    const logout = toMinutes(logoutTime);
    const breakIntervals = (breaks || []).map(b => {
      const [start, end] = b.split('-');
      return [toMinutes(start), toMinutes(end)];
    });

    const slots = [];
    let current = login;
    while (current + slotDurationMinutes <= logout) {
      const slotStart = current;
      const slotEnd = current + slotDurationMinutes;

      const isInBreak = breakIntervals.some(
        ([breakStart, breakEnd]) =>
          slotStart < breakEnd && slotEnd > breakStart
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

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

module.exports = generateWeeklySlots;
