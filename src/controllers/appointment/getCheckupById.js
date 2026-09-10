const { Op } = require("sequelize");
const { appointments, checkupAppointment, User, doctorProfile, generalUser } = require("../../../models");

const showCheckupById = async (req, res) => {

    const { id, scope } = req.user.payload;

    const appointmentId = req.params.id;

    if (!appointmentId) {
        return res.status(400).json({
            error: "Appointment ID is required."
        });
    }

    const checkupAppointmentRecord = await checkupAppointment.findOne({

        where: {
            appointment_id: appointmentId
        }
    });

    if (!checkupAppointmentRecord) {
        return res.status(404).json({
            error: "Checkup appointment not found."
        });
    }



    try {

        let appointment;

        if (scope === "doctor") {
            appointment = await doctorFollowup(appointmentId);
        } else if (scope === "general_user") {
            appointment = await patientFollowup(appointmentId);
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

const doctorFollowup = async (id) => {

    return checkupAppointment.findOne({

        where: {
            appointment_id: id,
        },

        include: [
            {
                model: User,
                as: "user",
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

const patientFollowup = async (id) => {

    return checkupAppointment.findOne({

        where: {

            appointment_id: id,

            appointment_date: {
                [Op.gte]: new Date()
            }

        },

        include: [
            {
                model: User,
                as: "user",
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

module.exports = showCheckupById;