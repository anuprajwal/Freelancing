const { doctorSlots } = require("../../../models")


const checkSlotAvailability = async (doctor_id, start, end, date, mode) => {
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });
  if (!slotRecord || !slotRecord.slots) return false;

  console.log('about the search:', doctor_id, start, end, date, mode)

  if (mode.includes("online")){
    mode = 'online'
  }else if (mode.includes("offline")){
    mode = 'offline'
  }

  console.log(typeof slotRecord.slots, slotRecord.slots);


  // Find slots for the given date
  const dayEntry = slotRecord.slots.find(entry => entry.date === date);
  console.log('doctor slot found:',dayEntry)
  if (!dayEntry || !dayEntry.slots) return false;

  console.log(dayEntry)

  console.log(!((dayEntry.mode === "online" || dayEntry.mode === "hybrid") && mode === 'online'))

  if (!((dayEntry.mode === "online" || dayEntry.mode === "hybrid") && mode === 'online') && !((dayEntry.mode === "offline" || dayEntry.mode === "hybrid") && mode === 'offline')){
    return false
  }

  // Check if the exact slot exists
  return dayEntry.slots.some(slot =>
    slot.start === start && slot.end === end
  );
};

module.exports = checkSlotAvailability;
