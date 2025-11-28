
const { appointments, checkupAppointment } = require('../../../models');

const showAllAppointments = async (req, res) => {
  const userId = req.user.payload.id;

  try {
    let userAppointments

    if (req.user.payload.scope === "general_user"){
      userAppointments = await patientSideAppointments(userId)
    }else if (req.user.payload.scope === "doctor"){
      userAppointments = await doctorSideAppointments(userId)
    }

    return res.status(200).json({ appointments: userAppointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({ error: "Failed to fetch appointments." });
  }
};

const doctorSideAppointments = async (doctor_id)=>{
  const upcommingAppointments = await appointments.findAll({
    where : {doctor_id},
    include: [
        {
          model: checkupAppointment,
          as: 'checkupAppointment'
        }
      ],
      order: [['appointment_date', 'DESC']]
  })
  return upcommingAppointments
}

const patientSideAppointments = async (userId)=>{
  const userAppointments = await appointments.findAll({
    where: { user_id: userId },
    include: [
      {
        model: checkupAppointment,
        as: 'checkupAppointment'
      }
    ],
    order: [['appointment_date', 'DESC']]
  });
  return userAppointments
}

module.exports = showAllAppointments;
