const {
    doctorProfile,
    address,
    doctorSlots,
    User
} = require("../../../models");
const {
    Op
} = require("sequelize");

const filterDoctor = async (req, res) => {
    // 1. Extract query parameters including pagination
    const {
        specialization,
        pincode
    } = req.query;

    // Use Math.max to prevent negative pagination values
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        // 2. Build the Dynamic Where Clause for doctorProfile (Specialization)
        const doctorWhereClause = {
            verified_status: true,
            kyc_status: "verified"
        };

        if (specialization && specialization.trim() !== "") {
            doctorWhereClause.specialization = {
                [Op.like]: `%${specialization}%`
            };
        }

        // 3. Define the Address Inclusion (Pincode Partial Match)
        const addressWhere = {};
        if (pincode && pincode.trim() !== "") {
            addressWhere.pincode = {
                [Op.like]: `%${pincode}%`
            };
        }

        // 4. Execute Query with findAndCountAll using limit and offset
        const {
            count,
            rows: doctors
        } = await doctorProfile.findAndCountAll({
            where: doctorWhereClause,
            limit: limit,
            offset: offset,
            distinct: true,
            attributes: [
                "id", "user_id", "date_of_birth", "gender", "specialization",
                "practice_start_date", "consultation_fee", "organisation_id",
                "verified_status", "profile_picture", "appointment_time"
            ],
            include: [{
                model: User,
                as: "user",
                attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'],
                required: !!pincode,
                include: [{
                        model: doctorSlots,
                        as: "doctorSlots"
                    },
                    {
                        model: address,
                        as: "address",
                        where: addressWhere,
                        required: !!pincode
                    }
                ]
            }]
        });

        // 5. Response handling
        return res.status(200).json({
            success: true,
            total: count,
            limit,
            offset,
            doctors: doctors.length > 0 ? doctors : [],
            message: doctors.length === 0 ? "No doctors found matching the criteria." : "Doctors retrieved successfully"
        });

    } catch (error) {
        console.error(`[filterDoctor Error]: ${error}`);
        return res.status(500).json({
            success: false,
            error: "An internal server error occurred while filtering doctors.",
            details: error.message
        });
    }
};

module.exports = filterDoctor;