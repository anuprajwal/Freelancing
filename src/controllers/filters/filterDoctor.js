const {
    doctorProfile,
    address,
    doctorSlots,
    User,
    organisationProfile,
    sequelize
} = require("../../../models");

const { Op } = require("sequelize");

const filterDoctor = async (req, res) => {
    // 1. Extract query parameters including pagination and search filters
    const { name, specialization, pincode } = req.query;

    // Prevent negative pagination values
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        // 2. Build the Dynamic Where Clause for doctorProfile
        const doctorWhereClause = {
            verified_status: true,
            kyc_status: "verified"
        };

        // ---------------------------------------------------------
        // SPECIALIZATION FILTER
        // ---------------------------------------------------------
        if (specialization) {
            let specsArray = [];

            if (Array.isArray(specialization)) {
                specsArray = specialization
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
            } else if (typeof specialization === "string") {
                specsArray = specialization
                    .split(",")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
            }

            if (specsArray.length > 0) {
                const specConditions = specsArray.map((spec) =>
                    sequelize.where(
                        sequelize.fn(
                            "LOWER",
                            sequelize.col("doctorProfile.specialization")
                        ),
                        {
                            [Op.like]: `%${spec}%`
                        }
                    )
                );

                // Using Op.or so passing "cardio,derma" returns doctors matching EITHER
                doctorWhereClause[Op.or] = specConditions;
            }
        }

        // 3. Define User Where Clause (Doctor Name Match)
        const userWhere = {};
        const trimmedName = name ? name.trim() : "";

        if (trimmedName) {
            userWhere.username = {
                [Op.like]: `%${trimmedName}%`
            };
        }

        // 4. Define Address Inclusion (Pincode Match)
        const addressWhere = {};
        const trimmedPincode = pincode ? pincode.trim() : "";

        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        // 5. Execute Query
        const { count, rows: doctors } = await doctorProfile.findAndCountAll({
            where: doctorWhereClause,
            limit: limit,
            offset: offset,
            distinct: true,

            attributes: [
                "id",
                "user_id",
                "date_of_birth",
                "gender",
                "specialization",
                "practice_start_date",
                "consultation_fee",
                "organisation_id",
                "verified_status",
                "profile_picture",
                "appointment_time"
            ],

            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "phone_number",
                        "username",
                        "email",
                        "is_email_verified",
                        "is_phone_verified"
                    ],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    // Required only if filtering by doctor name
                    required: !!trimmedName,

                    include: [
                        {
                            model: doctorSlots,
                            as: "doctorSlots"
                        },
                        {
                            model: address,
                            as: "address",
                            where: Object.keys(addressWhere).length > 0 ? addressWhere : undefined,
                            // Inner join address table only when pincode filter is supplied
                            required: !!trimmedPincode
                        }
                    ]
                },
                {
                    model: organisationProfile,
                    as: "organisation",
                    required: false
                }
            ]
        });

        // 6. Response handling
        return res.status(200).json({
            success: true,
            total: count,
            limit,
            offset,
            doctors: doctors.length > 0 ? doctors : [],
            message: doctors.length === 0
                ? "No doctors found matching the criteria."
                : "Doctors retrieved successfully"
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