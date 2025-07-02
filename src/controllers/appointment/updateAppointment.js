const { appointments, User } = require("../../../models");
const { validateDoctorAvailability } = require("../../middlewares/doctorAvailablityValidation");


// api to update appointment
//error in doctorUser finding

const updateAppointment = async (req, res) => {
  const { appointment_id} = req.body;
  const { payload } = req.user;
  const { id } = payload;

  if (!appointment_id) {
    return res.status(400).json({ error: "Appointment ID is required" });
  }

  const user = await User.findByPk(id);

  const appointment = await appointments.findOne({where: {id: appointment_id, user_id: id}});

  if (!appointment) {
    return res.status(404).json({error: "Appointment not found"});
  }

  const {appointment_date=appointment.appointment_date, appointment_type= appointment.appointment_type, prescription= appointment.prescription } = req.body;

  const validAppointmentTypes = ['online_video','online_audio','offline']
  validateDoctorAvailability(req, res, null ,appointment)


  const { doctor, appointmentTimeFormatted } = req.doctorAvailabilityData;
  const doctorUser = await User.findByPk(doctor?.user_id);

  if (user.email === doctorUser.email) {
    logger.warning(`User is recognized as patient scheduling to his own account`);
    return res.status(400).json({ error: "You cannot schedule an appointment with yourself" });
  }

  const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);

  // Check minimum advance notice (1 hour)
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  if (appointmentDateTime < oneHourFromNow) {
    logger.warning(`User: ${id} is scheduling appointment within 1 hour`);
    return res.status(400).json({ 
      error: "Appointments must be scheduled at least 1 hour in advance" 
    });
  }

  if (user.id !== appointment.user_id) {
    return res.status(400).json({ error: "only appointment creator can update appointment" });
  }

  if (appointment.appointment_status !== "pending") {
    return res.status(400).json({ error: "Appointment is not in initial stage" });
  }
  
  if (prescription) {
    return res.status(400).json({ error: "User can't descide prescription" });
  }

  if (!validAppointmentTypes.includes(appointment_type)){
    return res.status(400).json({error:"appointment type is not valid"})
  }

  appointments.update({
    appointment_date,
    appointment_time: appointmentTimeFormatted,
    appointment_type,
    appointment_status: "pending"
  }, {where:{id:appointment_id , user_id : id}})
};

module.exports = updateAppointment;
