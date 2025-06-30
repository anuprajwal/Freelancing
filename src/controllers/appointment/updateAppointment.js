const { appointments, doctorProfile, User } = require("../../../models");


// api to update appointment
// it is not complete yet. it is built completely on resumin the project
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

  const { appointment_status= appointment.appointment_status, appointment_type= appointment.appointment_type, appointment_date= appointment.appointment_date, appointment_time= appointment.appointment_time, prescription= appointment.prescription } = req.body;


  if (appointment_date < new Date()) {
    return res.status(400).json({ error: "Appointment date cannot be in the past" });
  }

  const doctor = await doctorProfile.findOne({where: {id: appointment.doctor_id}});
  
  if (!doctor) {
    return res.status(404).json({error: "Doctor not found"});
  }

  if (user.id !== appointment.user_id) {

    return res.status(400).json({ error: "only appointment creator can update appointment" });

    if (appointment.appointment_status === "closed") {
      return res.status(400).json({ error: "Appointment is already closed" });
    }

    if (appointment_date||appointment_time||appointment_type) {
      return res.status(400).json({ error: "Doctor cannot change appointment date, time or type" });
    }

    if (prescription && appointment_status !== "closed") {
      return res.status(400).json({ error: "Appointment is not closed yet" });
    }

    if (appointment_status || (prescription && appointment_status === "closed")) {
      await appointment.update({appointment_status, prescription});
      return res.status(200).json({ message: "Appointment updated successfully", appointment });
    }

  }else{
    try {
        if (appointment_status !== "cancelled") {
            return res.status(400).json({ error: "user cannot change appointment status" });
        }

        if (prescription) {
          return res.status(400).json({ error: "user cannot make prescription" });
        }
        
        await appointment.update({appointment_type, appointment_date, appointment_time, appointment_status});
        return res.status(200).json({ message: "Appointment updated successfully", appointment });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Failed to update appointment" });
    }
  }
};

module.exports = updateAppointment;
