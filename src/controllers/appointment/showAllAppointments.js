const {
    appointments,
    checkupAppointment,
    User,
    doctorProfile,
    generalUser
} = require('../../../models');

const showAllAppointments = async (req, res) => {
    const userId = req.user.payload.id;
    // Extract limit and offset from the URL query strings
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
        let userAppointments;

        if (req.user.payload.scope === "general_user") {
            // Pass limit and offset to the helper function
            userAppointments = await patientSideAppointments(userId, limit, offset);
        } else if (req.user.payload.scope === "doctor") {
            userAppointments = await doctorSideAppointments(userId, limit, offset);
        }

        return res.status(200).json({
            appointments: userAppointments
        });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        return res.status(500).json({
            error: "Failed to fetch appointments."
        });
    }
};

const doctorSideAppointments = async (doctor_id, limit, offset) => {
    console.log("fetching appointments for:", doctor_id)
    const upcommingAppointments = await appointments.findAll({
        where: {
            doctor_id
        },
        limit: limit, // Added limit
        offset: offset, // Added offset
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
                    required: true,
                    attributes: ["gender", "date_of_birth", "profile_picture"],
                }]
            }
        ],
        order: [
            ["appointment_date", "DESC"]
        ]
    });

    return upcommingAppointments;
};

const patientSideAppointments = async (userId, limit, offset) => {
    const userAppointments = await appointments.findAll({
        where: {
            user_id: userId
        },
        limit: limit, // Added limit
        offset: offset, // Added offset
        attributes: [
            "id", "appointment_date", "appointment_start_time", "appointment_end_time",
            "appointment_status", "appointment_type", "payment_mode", "prescription",
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
                    required: true,
                    attributes: [
                        "gender", "specialization", "experience_years", "organisation_id",
                        "consultation_fee", "verified_status", "profile_picture", "appointment_time"
                    ]
                }]
            }
        ],
        order: [
            ["appointment_date", "DESC"]
        ]
    });

    return userAppointments;
};

module.exports = showAllAppointments;