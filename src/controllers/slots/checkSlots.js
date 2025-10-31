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
  let slotsRaw = slotRecord.slots;
let slots;

try {
  if (Buffer.isBuffer(slotsRaw)) {
    slotsRaw = slotsRaw.toString();
  }

  if (typeof slotsRaw === "string") {
    slots = JSON.parse(slotsRaw);

    // Handle double-parsed JSON
    if (typeof slots === "string") {
      slots = JSON.parse(slots);
    }
  } else if (Array.isArray(slotsRaw)) {
    slots = slotsRaw;
  } else {
    slots = [];
  }
} catch (err) {
  console.error("[Error] Failed to parse slots:", err);
  slots = [];
}

if (!Array.isArray(slots)) {
  console.error("[Error] slots is not an array even after parsing:", slots);
  slots = [];
}

const dayEntry = slots.find(entry => entry.date === date);
 
  if (!dayEntry || !dayEntry.slots) return false;

  console.log(!((dayEntry.mode === "online" || dayEntry.mode === "hybrid") && mode === 'online'))

  if (!((dayEntry.mode === "online" || dayEntry.mode === "hybrid") && mode === 'online') && !((dayEntry.mode === "offline" || dayEntry.mode === "hybrid") && mode === 'offline')){
    return false
  }

  console.log("day entry slots:",dayEntry.slots)

  // Check if the exact slot exists
  return dayEntry.slots.some(slot =>
    slot.start === start && slot.end === end
  );
};

module.exports = checkSlotAvailability;
