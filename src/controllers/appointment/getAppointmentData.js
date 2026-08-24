const {
    appointments,
    checkupAppointment,
    User,
    doctorProfile,
    generalUser
} = require('../../../models');

const showSingleAppointment = async (req, res) => {

    const userId = req.user.payload.id;
    const scope = req.user.payload.scope;
    const appointmentId = req.query.appointment_id;

    if (!appointmentId) {
        return res.status(400).json({
            error: "appointment_id is required"
        });
    }

    try {

        let appointment;

        if (scope === "general_user") {
            appointment = await patientSingleAppointment(userId, appointmentId);
        } else if (scope === "doctor") {
            appointment = await doctorSingleAppointment(userId, appointmentId);
        }

        if (!appointment) {
            return res.status(404).json({
                error: "Appointment not found"
            });
        }

        return res.status(200).json({
            appointment
        });

    } catch (error) {
        console.error("Error fetching appointment:", error);
        return res.status(500).json({
            error: "Failed to fetch appointment."
        });
    }
};



const doctorSingleAppointment = async (doctor_id, appointmentId) => {

    return await appointments.findOne({
        where: {
            id: appointmentId,
            doctor_id
        },
        include: [{
                model: checkupAppointment,
                as: "checkupAppointment"
            },
            {
                model: User,
                as: "patient",
                required: true,
                attributes: ["email", "username", "phone_number"],
                include: [{
                    model: generalUser,
                    as: "generalUser",
                    attributes: ["gender", "date_of_birth", "profile_picture"],
                }]
            }
        ]
    });
};


const patientSingleAppointment = async (userId, appointmentId) => {

    return await appointments.findOne({
        where: {
            id: appointmentId,
            user_id: userId
        },
        attributes: [
            "id", "appointment_date", "appointment_start_time",
            "appointment_end_time", "appointment_status",
            "appointment_type", "payment_mode", "prescription",
            "belongs_to_hospital", "organisation_id"
        ],
        include: [{
                model: checkupAppointment,
                as: "checkupAppointment"
            },
            {
                model: User,
                as: "doctor",
                required: true,
                attributes: ["email", "username", "phone_number"],
                include: [{
                    model: doctorProfile,
                    as: "doctorProfile",
                    attributes: [
                        "gender", "specialization", "practice_start_date",
                        "organisation_id", "consultation_fee",
                        "verified_status", "profile_picture", "appointment_time"
                    ]
                }]
            }
        ]
    });
};


module.exports = showSingleAppointment;