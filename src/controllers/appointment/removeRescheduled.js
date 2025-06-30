const { appointments, User, appointmentReschedule, doctorProfile } = require("../../../models");

// api to remove the reschedule request raised by doctor if not accepted by user
const removeRescheduled = async (req, res) => {
  const { payload } = req.user;
  const { id } = payload;

  logger.info(`recieved request for the removal of rescedule by the useer: ${id}`)
  const { reschedule_id } = req.body;

  if (!reschedule_id) {
    logger.warning(`request has no field of reschedule_id`)
    return res.status(400).json({ error: "Rescheduled ID is required" });
  }

  const reschedule = await appointmentReschedule.findOne({where: {id: reschedule_id, user_id: id}});
  
  if (!reschedule) {
    logger.warning(`requested reschedule: ${reschedule_id} by the user: ${id} is not found in the db`)
    return res.status(404).json({ error: "Rescheduled not found" });
  }

  if (reschedule.reschedule_status !== "requested") {
    logger.warning(`the reschedule request: ${reschedule_id} is already accepted`)
    return res.status(400).json({ error: "Request is already accepted" });
  }

  const user = await User.findByPk(id);
  const appointment = await appointments.findOne({where: {id: reschedule.appointment_id}});

  if (user.id !== appointment.doctor_id) {
    logger.warning(`the user: ${id} requestin to remove rescedule is not found as the request creator`)
    return res.status(400).json({ error: "only requested doctor can remove requested reschedule" });
  }


  try {  
    await appointmentReschedule.destroy({where: {id: reschedule_id}});
    logger.info(`the request to reschedule the appointment by user: ${id} is succesfully completed`)
    return res.status(200).json({ message: "requested rescheduled removed successfully" });
  } catch (error) {
    logger.error(`error occured in remove reschedule: ${error}`)
    return res.status(500).json({ error: "Failed to remove requested rescheduled" });
  }
};

module.exports = removeRescheduled;
