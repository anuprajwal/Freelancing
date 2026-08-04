const { Op } = require("sequelize");
const { appointments, checkupAppointment } = require("../../../models");

const showUpcomingAppointments = async (req, res) => {
  const userId = req.user.payload.id;
  const scope = req.user.payload.scope;

  try {
    let upcomingAppointments;

    if (scope === "general_user") {
      upcomingAppointments = await patientUpcomingAppointments(userId);
    } else if (scope === "doctor") {
      upcomingAppointments = await doctorUpcomingAppointments(userId);
    } else {
      return res.status(403).json({ error: "Invalid user scope." });
    }

    return res.status(200).json({
      appointments: upcomingAppointments,
    });
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    return res.status(500).json({
      error: "Failed to fetch upcoming appointments.",
    });
  }
};

const doctorUpcomingAppointments = async (doctor_id) => {
  return await appointments.findAll({
    where: {
      doctor_id,
      appointment_date: {
        [Op.gte]: new Date(),
      },
    },
    include: [
      {
        model: checkupAppointment,
        as: "checkupAppointment",
      },
    ],
    order: [["appointment_date", "ASC"]],
  });
};

const patientUpcomingAppointments = async (user_id) => {
  return await appointments.findAll({
    where: {
      user_id,
      appointment_date: {
        [Op.gte]: new Date(),
      },
    },
    include: [
      {
        model: checkupAppointment,
        as: "checkupAppointment",
      },
    ],
    order: [["appointment_date", "ASC"]],
  });
};

module.exports = showUpcomingAppointments;