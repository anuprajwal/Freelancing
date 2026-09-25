const {
    doctorProfile,
    address,
    doctorSlots,
    User,
    organisationProfile,
    sequelize
} = require("../../../models");

const { Op, literal } = require("sequelize");


const filterDoctorCombined = async (req, res) => {
    // 1. Extract query parameters
    const { name, specialization, pincode, userLatitude, userLongitude } = req.query;

    const filterInMeters = parseInt(req.query.filterInMeters, 10) || 5000;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        const trimmedName = name ? name.trim() : "";
        const trimmedPincode = pincode ? pincode.trim() : "";
        const parsedLat = parseFloat(userLatitude) || null;
        const parsedLng = parseFloat(userLongitude) || null;

        // 2. Dynamic Where Clause for doctorProfile
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

                doctorWhereClause[Op.or] = specConditions;
            }
        }

        // 3. User Where Clause (Name + Location Distance Match)
        const userWhere = {
            role: "doctor"
        };

        if (trimmedName) {
            userWhere.username = {
                [Op.like]: `%${trimmedName}%`
            };
        }

        const isGeoSearchActive = parsedLat !== null && parsedLng !== null;
        let distanceFormula = null;
        let attributesInclude = [];
        let orderClause = [];

        if (isGeoSearchActive) {
            // Mysql distance formula targeting latitude/longitude on the `User` model (`user` alias)
            distanceFormula = `
                6371000 * ACOS(
                    COS(RADIANS(${parsedLat})) *
                    COS(RADIANS(\`user\`.\`latitude\`)) *
                    COS(RADIANS(\`user\`.\`longitude\`) - RADIANS(${parsedLng})) +
                    SIN(RADIANS(${parsedLat})) *
                    SIN(RADIANS(\`user\`.\`latitude\`))
                )
            `;

            attributesInclude.push([literal(distanceFormula), "distance"]);

            // Apply distance filter directly inside userWhere
            userWhere[Op.and] = userWhere[Op.and] || [];
            userWhere[Op.and].push(literal(`${distanceFormula} <=${filterInMeters}`));

            // Sort by nearest distance first
            orderClause.push([literal(distanceFormula), "ASC"]);
        }

        // 4. Address Where Clause (Pincode Match)
        const addressWhere = {};
        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        // 5. Execute Combined Query
        const { count, rows: doctors } = await doctorProfile.findAndCountAll({
            where: doctorWhereClause,
            limit: limit,
            offset: offset,
            distinct: true,
            order: orderClause.length > 0 ? orderClause : undefined,

            attributes: {
                include: attributesInclude,
                fields: [
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
                ]
            },

            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "id",
                        "phone_number",
                        "username",
                        "email",
                        "latitude",
                        "longitude",
                        "is_email_verified",
                        "is_phone_verified"
                    ],
                    where: userWhere,
                    // Inner join User if searching by name OR searching by geolocation distance
                    required: !!trimmedName || isGeoSearchActive,

                    include: [
                        {
                            model: doctorSlots,
                            as: "doctorSlots"
                        },
                        {
                            model: address,
                            as: "address",
                            where: Object.keys(addressWhere).length > 0 ? addressWhere : undefined,
                            // Inner join address table ONLY when a pincode filter is supplied
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

        // 6. Response Handling
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
        console.error(`[filterDoctorCombined Error]: ${error}`);

        return res.status(500).json({
            success: false,
            error: "An internal server error occurred while filtering doctors.",
            details: error.message
        });
    }
};

module.exports = filterDoctorCombined;