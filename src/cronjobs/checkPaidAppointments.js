const cron = require('node-cron');
const { appointments, payments, doctorProfile, doctorSlots } = require('../../models');
require('dotenv').config();
const { Op } = require('sequelize');


async function startCron() {
  try {
    // Schedule the cron to run every 10 minutes
    cron.schedule('*/7 * * * *', async () => {
      console.log('[CronJob] Tick:', new Date().toISOString());
      console.log('[CronJob] Checking for pending online appointments older than 10 minutes...');

      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        console.log(tenMinutesAgo)
        const isParanoid = !!(appointments && appointments.options && appointments.options.paranoid);
  console.log('[CronJob] appointments model paranoid:', isParanoid);

        // Find appointments older than 10 minutes and still pending
        const pendingAppointments = await appointments.findAll({
          where: {
            payment_mode: 'online',
            appointment_status: 'pending',
            created_at: { [Op.lt]: tenMinutesAgo },
          },
          include: [
            {
              model: payments,
              as: 'payments',
              required: false,
              where: { payment_status: ['pending', 'failed'] },
            },
          ],
        });
        

        if (!pendingAppointments.length) {
          console.log('[CronJob] No pending appointments found to delete.');
          return;
        }

        for (const eachAppointment of pendingAppointments) {
          console.log(`[CronJob] Deleting appointment ID: ${eachAppointment.id}...`);

          const { doctor_id, appointment_date, appointment_start_time, appointment_end_time } = eachAppointment;
		console.log("doc id is:", doctor_id)
		console.log("date is:", appointment_date, appointment_start_time, appointment_end_time)
          // Find doctor details
          const doctor_profile_data = await doctorProfile.findOne({ where: { user_id: doctor_id } });
          if (!doctor_profile_data) continue;

          // Fetch slot record
          const slotRecord = await doctorSlots.findOne({
            where: { doctor_id: doctor_profile_data.user_id },
          });

          if (!slotRecord) continue;

          let slotsData;

try {
  if (!slotRecord.slots) {
    slotsData = [];
  } else if (Buffer.isBuffer(slotRecord.slots)) {
    slotsData = JSON.parse(slotRecord.slots.toString());
  } else if (typeof slotRecord.slots === 'string') {
    slotsData = JSON.parse(slotRecord.slots);
  } else if (Array.isArray(slotRecord.slots)) {
    slotsData = slotRecord.slots;
  } else {
    // handle double-encoded JSON or bad type
    slotsData = JSON.parse(JSON.stringify(slotRecord.slots));
  }
} catch (err) {
  console.error('[CronJob] Failed to parse slotsData:', err);
  slotsData = [];
}

if (!Array.isArray(slotsData)) {
  console.error('[CronJob] Invalid slotsData type, resetting to []');
  slotsData = [];
}

const convertedDate = appointment_date.toISOString().split('T')[0];
const dateIndex = slotsData.findIndex((s) => s.date === convertedDate);

	  

		if (dateIndex !== -1) {
            const daySlots = slotsData[dateIndex].slots || [];

			// Convert to "HH:MM" format (strip seconds)
const formatTime = (timeVal) => {
	console.log(typeof timeVal)
	console.log(timeVal)
  if (!timeVal) return '';

  // Handle if it's a Date object (some MySQL drivers return Time as Date)
  if (timeVal instanceof Date) {
	  cosnole.log("it is instance of date")
    return timeVal.toTimeString().slice(0, 5); // "HH:MM"
  }

  // Handle if it's a Buffer (rare, but possible)
  if (Buffer.isBuffer(timeVal)) {
	  console.log("it is buffer")
    return timeVal.toString().slice(0, 5);
  }

  // Handle plain string
  const str = String(timeVal);
  if (str.includes(':')) return str.slice(0, 5);

  return str;
};
const startTime = formatTime(appointment_start_time);
const endTime = formatTime(appointment_end_time);
console.log("processed values:", startTime, endTime)

            // Restore slot (if not already there)
            const isAlreadyThere = daySlots.some(
              (slot) =>
                slot.start === startTime && slot.end === endTime
            );

            if (!isAlreadyThere) {
              daySlots.push({
                start: startTime,
                end: endTime,
              });

              // Sort slots by start time
              daySlots.sort((a, b) => a.start.localeCompare(b.start));
              slotsData[dateIndex].slots = daySlots;

              await doctorSlots.update(
                { slots: JSON.stringify(slotsData) },
                { where: { doctor_id: doctor_profile_data.user_id } }
              );

              console.log(`[CronJob] Restored slot for doctor ID: ${doctor_id}`);
            }
          }

          // Delete the appointment
          await appointments.destroy({ where: { id: eachAppointment.id } });
          console.log(`[CronJob] Deleted appointment ID: ${eachAppointment.id}`);
        }
      } catch (err) {
        console.error('[CronJob] Error while processing appointments:', err);
      }
    });

    console.log('[CronJob] Job scheduled to run every 10 minutes');
  } catch (err) {
    console.error('[CronJob] DB connection failed:', err);
  }
}

module.exports = startCron;
