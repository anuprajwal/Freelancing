const { Op } = require("sequelize");
const { appointments, checkupAppointment, User, generalUser, doctorProfile } = require("../../../models");

const showTodayAppointments = async (req, res) => {
    const { id, scope } = req.user.payload;

    try {
        let data;

        if (scope === "doctor") {
            data = await doctorTodayAppointments(id);
        } else if (scope === "general_user") {
            data = await patientTodayAppointments(id);
        } else {
            return res.status(403).json({
                error: "Invalid user scope."
            });
        }

        return res.status(200).json({
            appointments: data
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: "Failed to fetch today's appointments."
        });
    }
};

const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const doctorTodayAppointments = async (doctor_id) => {

    const { start, end } = getTodayRange();

    return appointments.findAll({

        where: {
            doctor_id,
            appointment_date: {
                [Op.between]: [start, end]
            }
        },

        include: [
            {
                model: checkupAppointment,
                as: "checkupAppointment"
            },
            {
                model: User,
                as: "patient",
                required: true,
                attributes: ["id", "email", "username", "phone_number"],
                include: [{
                    model: generalUser,
                    as: "generalUser",
                    required: true,
                    attributes: ["id", "gender", "date_of_birth", "profile_picture"],
                }]
            }
        ],

        order: [["appointment_date", "ASC"]]

    });

};

const patientTodayAppointments = async (user_id) => {

    const { start, end } = getTodayRange();

    return appointments.findAll({

        where: {
            user_id,
            appointment_date: {
                [Op.between]: [start, end]
            }
        },

        include: [
            {
                model: checkupAppointment,
                as: "checkupAppointment"
            },
            {
                model: User,
                as: "doctor",
                required: true,
                attributes: ["id", "email", "username", "phone_number"],
                include: [{
                    model: doctorProfile,
                    as: "doctorProfile",
                    required: true,
                    attributes: [
                        "id", "gender", "specialization", "practice_start_date", "organisation_id",
                        "consultation_fee", "verified_status", "profile_picture", "appointment_time"
                    ]
                }]
            }
        ],

        order: [["appointment_date", "ASC"]]

    });

};

module.exports = showTodayAppointments;