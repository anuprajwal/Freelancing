const logger = require("../../../logger");
const { appointments, User } = require("../../../models");


// api to delete an existing pending or accepted appointment
const deleteAppointment = async (req, res) => {
  const { payload } = req.user;
  const { id } = payload;

  logger.info(`request to delete an existing appointment from user: ${id} recieved`)
  const { appointment_id } = req.body;
  if (!appointment_id) {
    logger.warning(`the request made by user: ${id} has no field appointment_id`)
    return res.status(400).json({ error: "Appointment ID is required" });
  }
  try {
    const appointment = await appointments.findOne({where: {id: appointment_id, user_id: id}});
    const user = await User.findByPk(id);
    if (!appointment) {
      logger.warning(`the appointment: ${appointment_id} which user: ${id} is trying to delete is not found in te db`)
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (user.id !== appointment.user_id) {
      logger.warning(`the appointment: ${appointment_id} is not created by the user: ${id} to be deleted`)
      return res.status(400).json({ error: "only appointment creator can delete appointment" });
    }

    if (appointment.appointment_status === "closed") {
      logger.warning(`the appointment: ${appointment_id} user: ${id} is trying to delete is already complete`)
        return res.status(404).json({ error: "Appointment already closed" });
    }
    await appointment.destroy();
    logger.info(`appointment: ${appointment_id} is succesfully deletes by the user : ${id}`)
  return res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (error) {
    logger.error(`error in te delete appointments: ${error}`);
    return res.status(500).json({ error: "Failed to delete appointment" });
  }
};

module.exports = deleteAppointment;
