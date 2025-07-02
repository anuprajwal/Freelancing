const logger = require("../../../logger");
const { appointments, appointmentReschedule, doctorProfile } = require("../../../models");


// api to request rescheduling by doctor
const rescheduleRequest = async (req, res) => {
  const { payload } = req.user;
  const { id } = payload;

  logger.info(`recieved request to remove the reschedule by user: ${id}`)
  const { appointment_id } = req.body;

  if (!appointment_id) {
    logger.warning(`appointment_id id not found in the request made by user: ${id}`)
    return res.status(400).json({ error: "Appointment ID is required" });
  }

  const doctor = await doctorProfile.findOne({where: {user_id: id}});

 

  const appointment = await appointments.findOne({where: {id: appointment_id, doctor_id: doctor.id}});
  if (!appointment) {
    logger.warning(`the appointment user: ${id} is refering to is not found in the db`)
    return res.status(404).json({ error: "Appointment not found" });
  }

  if (doctor.id !== appointment.doctor_id) {
    logger.warning(`the user: ${id} is not found as the doctor who is appointed for the appointment: ${appointment_id}`)
    return res.status(400).json({ error: "only appointed doctor can request for appointment rescheduling" });
  }

  const { new_date=appointment.appointment_date, new_time=appointment.appointment_time, new_type=appointment.appointment_type, doctor_id=appointment.doctor_id } = req.body;
  

  try {  
    if (appointment.appointment_status === "closed" || appointment.appointment_status === "cancelled") {
      logger.warning(`the appointment: ${appointment_id} user: ${id} is refering to is no longer in open state`)
        return res.status(404).json({ error: "Appointment is no longer available" });
    }

    if (new_date < new Date()) {
      logger.warning(`the date user: ${id} has requested to reschedule is in the past`)
        return res.status(400).json({ error: "New date cannot be in the past" });
    }

    await appointmentReschedule.create({
        appointment_id: appointment.id,
        user_id: id,
        doctor_id: doctor_id,
        appointment_date: new_date,
        appointment_time: new_time,
        appointment_type: new_type,
    });

    await appointment.update({appointment_date: new_date, appointment_time: new_time, appointment_type: new_type, doctor_id: doctor_id});

    logger.info(`request made by user: ${id} to reschedule the appointment: ${appointment_id} is complete succesfully`)
    return res.status(200).json({ message: "requested for appointment rescheduled successfully" });
  } catch (error) {
    logger.error(`error occured in the appointment rescheduling: ${error}`)
    return res.status(500).json({ error: "Failed to request for appointment rescheduling" });
  }
};

module.exports = rescheduleRequest;
