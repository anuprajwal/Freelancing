const { doctorSlots } = require("../../../models")


const checkSlotAvailability = async (doctor_id, start, end, date) => {
  const slotRecord = await doctorSlots.findOne({ where: { doctor_id } });
  if (!slotRecord || !slotRecord.slots) return false;

  // Find slots for the given date
  const dayEntry = slotRecord.slots.find(entry => entry.date === date);
  if (!dayEntry || !dayEntry.slots) return false;

  // Check if the exact slot exists
  return dayEntry.slots.some(slot =>
    slot.start === start && slot.end === end
  );
};

module.exports = checkSlotAvailability;
