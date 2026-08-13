const { Op } = require("sequelize");
const { appointments, checkupAppointment, User, doctorProfile, generalUser } = require("../../../models");

const showNextAppointment = async (req, res) => {

    const { id, scope } = req.user.payload;

    try {

        let appointment;

        if (scope === "doctor") {
            appointment = await doctorNextAppointment(id);
        } else if (scope === "general_user") {
            appointment = await patientNextAppointment(id);
        } else {
            return res.status(403).json({
                error: "Invalid user scope."
            });
        }

        return res.status(200).json({
            appointment
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: "Failed to fetch next appointment."
        });

    }

};

const doctorNextAppointment = async (doctor_id) => {

    return appointments.findOne({

        where: {

            doctor_id,

            appointment_date: {
                [Op.gte]: new Date()
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

const patientNextAppointment = async (user_id) => {

    return appointments.findOne({

        where: {

            user_id,

            appointment_date: {
                [Op.gte]: new Date()
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
                        "id", "gender", "specialization", "experience_years", "organisation_id",
                        "consultation_fee", "verified_status", "profile_picture", "appointment_time"
                    ]
                }]
            }
        ],

        order: [["appointment_date", "ASC"]]

    });

};

module.exports = showNextAppointment;