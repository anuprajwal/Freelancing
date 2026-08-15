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
    // 1. Extract query parameters
    const {
        specialization,
        pincode
    } = req.query;

    // Use Math.max to prevent negative pagination values
    const limit = Math.max(1, parseInt(req.query.limit) || 4);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    try {
        // 2. Build the Dynamic Where Clause for doctorProfile (Specialization)
        const doctorWhereClause = {
            verified_status: true,
            kyc_status: "verified"
        };

        if (specialization && specialization.trim() !== "") {
            // Partial match: searches for "card" within "Cardiologist"
            doctorWhereClause.specialization = {
                [Op.like]: `%${specialization}%`
            };
        }

        // 3. Define the Address Inclusion (Pincode Partial Match)
        const addressWhere = {};
        if (pincode && pincode.trim() !== "") {
            // Partial match: searches for "400" within "400001"
            addressWhere.pincode = {
                [Op.like]: `%${pincode}%`
            };
        }

        // 4. Execute Query with findAndCountAll
        const {
            count,
            rows: doctors
        } = await doctorProfile.findAndCountAll({
            where: doctorWhereClause,
            limit: limit,
            offset: offset,
            distinct: true, // Essential for accurate counts when using nested includes
            attributes: [
                "id", "user_id", "date_of_birth", "gender", "specialization",
                "experience_years", "consultation_fee", "organisation_id",
                "verified_status", "profile_picture", "appointment_time"
            ],
            include: [{
                model: User,
                as: "user",
                attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'],
                // If filtering by pincode, the User/Address relation becomes required (INNER JOIN)
                required: !!pincode,
                include: [{
                        model: doctorSlots,
                        as: "doctorSlots"
                    },
                    {
                        model: address,
                        as: "address",
                        where: addressWhere,
                        // Ensure that if a pincode is provided, we only return doctors linked to that address
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