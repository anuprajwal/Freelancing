// const logger = require("../../../logger");
// const { appointments, appointmentReschedule, doctorProfile } = require("../../../models");
// const { Op, Sequelize } = require("sequelize");


// // api to show all the appointments, doctors assined to the appointments, and reschedule for any appointments if any
// const showAllAppointments = async (req, res) => {
//   const { payload } = req.user;
//   const { id } = payload;

//   logger.info(`recieved request to show all appointments by the user : ${id}`)
//   const { status=["pending", "confirmed", "cancelled", "closed"] } = req.query;
  

//   const userAppointments = await appointments.findAll({
//     where: {
//       user_id: id,
//       appointment_status: {
//         [Op.in]: status,
//       },
//     },
//     include: [
//       {
//         model: appointmentReschedule,
//         as: "reschedule",
//         attributes: ["id", "appointment_date", "appointment_time", "appointment_type", "reschedule_status"],
//         required: false,
        
//         where: {
//           reschedule_status: {
//             [Op.eq]: "requested",
//           },
//         },
//         include: [
//           {
//             model: doctorProfile,
//             as: "doctor",
//             attributes: ["id", "specialization"],
//             required: true,
//             on: {
//               id: {
//                 [Op.eq]: Sequelize.col("reschedule.doctor_id"),
//               },
//             },
//           },
//         ],
//       },

//       {
//         model: doctorProfile,
//         as: "doctor",
//         attributes: ["id", "specialization"],
//         required: true,
//         on: {
//           id: {
//             [Op.eq]: Sequelize.col("appointments.doctor_id"),
//           },
//         },
//       },
//     ],
//     order: [["appointment_date", "DESC"]],
//   });

//   logger.info(`request to get all the appointments by the user: ${id} is succesfull`)  
//   return res.status(200).json({ userAppointments });
// };

// module.exports = showAllAppointments;





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
