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
  let slots;
  if (typeof slotRecord.slots === "string") {
    try {
      slots = JSON.parse(slots);
    } catch (e) {
      slots = []; // fallback if parsing fails
    }
  }
  

  // Find slots for the given date
  const dayEntry = slots.find(entry => entry.date === date);
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
