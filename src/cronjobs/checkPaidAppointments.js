// cron/updateNameJob.js
const cron = require('node-cron');
const { appointments, payments, doctorProfile, doctorSlots } = require('../../models');
const { Sequelize } = require("sequelize");
require("dotenv").config();


async function startCron() {
  try {
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT || 'mysql',  
      logging: false, 
    });
    await sequelize.authenticate();
    console.log('[CronJob] Database connected.');

    // Schedule task every 10 minutes
    cron.schedule('* * * * *', async () => {
      console.log('[CronJob] Running checking paid or unpaid appointments...');

      try {
        const allUnpaidAppointments = await appointments.findAll({
            where: {
              payment_mode: 'online',
              appointment_status : "pending"
            },
            // include: [{
            //   model: payments,
            //   as: 'payments',
            //   required: true, 
            // //   where: {
            // //     payment_status: ['pending', 'failed'],
            // //   }
            // }]
          });
          console.log(allUnpaidAppointments)
        if (allUnpaidAppointments) {
          allUnpaidAppointments.map(async eachAppointment=>{
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            console.log(tenMinutesAgo)
            console.log(new Date(eachAppointment.created_at) >= tenMinutesAgo)
            console.log(new Date(eachAppointment.created_at))
            if (new Date(eachAppointment.created_at) >= tenMinutesAgo) {
                console.log("converting apointment:", eachAppointment.id)
                await appointments.update(
                  { appointment_status: "unpaid" },
                  { where: { id: eachAppointment.id } }
                );
                console.log(`[CronJob] Updated appointment ${eachAppointment.id} status to unpaid`);

                let { doctor_id, appointment_date, appointment_start_time, appointment_end_time } = eachAppointment;

                const doctor_profile_data = await doctorProfile.findOne({
                    where:{
                      id : doctor_id
                    }
                })
                const slotRecord = await doctorSlots.findOne({ where: { doctor_id : doctor_profile_data.user_id } });
                const converted_date = appointment_date.toISOString().split('T')[0];
                if (slotRecord && !Array.isArray(slotRecord.slots)){
                    try {
                      slotRecord.slots = JSON.parse(slotRecord.slots);
                    } catch (err) {
                      console.error("Invalid slots JSON string:", err);
                      slotRecord.slots = [];
                    }
                }

                if (slotRecord && Array.isArray(slotRecord.slots)) {
                    let slots;
                    if (typeof slotRecord.slots === "string"){
                        slots = JSON.parse(slotRecord.slots);
                    }else{
                        slots = slotRecord.slots
                    }
                    const updatedSlots = [...slots];
                    const dateIndex = updatedSlots.findIndex(s => s.date === converted_date);
                
                    if (dateIndex !== -1) {
                      const daySlots = updatedSlots[dateIndex].slots || [];
                
                      // Prevent duplicate slot
                      const isAlreadyThere = daySlots.some(slot =>
                        slot.start === appointment_start_time && slot.end === appointment_end_time
                      );
                
                      if (!isAlreadyThere) {
                        const [startHours, startMinutes] = appointment_start_time.split(":");
                        const formattedAppointmmentStartTime = `${startHours}:${startMinutes}`;
                        const [endHours, endMinutes] = appointment_end_time.split(":");
                        const formattedAppointmmentEndTime = `${endHours}:${endMinutes}`;
                        
                        daySlots.push({
                          start: formattedAppointmmentStartTime,
                          end: formattedAppointmmentEndTime
                        });
                
                        // Sort slots again in time order
                        daySlots.sort((a, b) => a.start.localeCompare(b.start));
                
                        updatedSlots[dateIndex].slots = daySlots;
                        console.log(updatedSlots)
                
                        await doctorSlots.update(
                          { slots: updatedSlots },
                          { where: { doctor_id } }
                        );
                        console.log(`[CronJob] Restored the previous slot succesfully`);
                      }
                    }
                  }
              }
          })
          
        } else {
          console.log('[CronJob] No unpaid appointments found to update');
        }
      } catch (err) {
        console.error('[CronJob] Error in job execution:', err);
      }
    });

    console.log('[CronJob] Job scheduled to run every 10 minutes');
  } catch (err) {
    console.error('[CronJob] DB connection failed:', err);
  }
}

startCron();
