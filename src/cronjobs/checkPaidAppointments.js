const cron = require('node-cron');
const { appointments, payments, doctorProfile, doctorSlots } = require('../../models');
require('dotenv').config();

async function startCron() {
  try {
    // Schedule the cron to run every 10 minutes
    cron.schedule('* * * * *', async () => {
      console.log('[CronJob] Checking for pending online appointments older than 10 minutes...');

      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

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

          // Find doctor details
          const doctor_profile_data = await doctorProfile.findOne({ where: { id: doctor_id } });
          if (!doctor_profile_data) continue;

          // Fetch slot record
          const slotRecord = await doctorSlots.findOne({
            where: { doctor_id: doctor_profile_data.user_id },
          });

          if (!slotRecord) continue;

          let slotsData = typeof slotRecord.slots === 'string' ? JSON.parse(slotRecord.slots) : slotRecord.slots;
          const convertedDate = appointment_date.toISOString().split('T')[0];

          const dateIndex = slotsData.findIndex((s) => s.date === convertedDate);
          if (dateIndex !== -1) {
            const daySlots = slotsData[dateIndex].slots || [];

            // Restore slot (if not already there)
            const isAlreadyThere = daySlots.some(
              (slot) =>
                slot.start === appointment_start_time && slot.end === appointment_end_time
            );

            if (!isAlreadyThere) {
              daySlots.push({
                start: appointment_start_time,
                end: appointment_end_time,
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