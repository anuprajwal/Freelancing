
const { appointments, checkupAppointment, followUp } = require('../../../models');

const getUserAppointmentsWithChildren = async (req, res) => {
  const userId = req.user.payload.id;

  try {
    const userAppointments = await appointments.findAll({
      where: { user_id: userId },
      include: [
        {
          model: checkupAppointment,
          as: 'checkupAppointment'
        },
        {
          model: followUp,
          as: 'followUp'
        }
      ],
      order: [['appointment_date', 'DESC']]
    });

    return res.status(200).json({ appointments: userAppointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({ error: "Failed to fetch appointments." });
  }
};

module.exports = getUserAppointmentsWithChildren;
