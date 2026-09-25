const {
    organisationProfile,
    address,
    User,
    sequelize // Ensure sequelize instance is imported for custom queries
} = require("../../../models");
const {
    Op
} = require('sequelize');


const filterHospitals = async (req, res) => {
    const {
        name,
        type = ["hospital", "clinic", "pharmacy", "laboratory"],
        pincode,
    } = req.query;

    // Accept both parameter variations
    const specializationQuery = req.query.specializations_provided || req.query.specialization;

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        const trimmedName = name ? name.trim() : "";
        const trimmedPincode = pincode ? pincode.trim() : "";

        // Base filter condition
        const organisationWhere = {
            verified_status: true
        };

        // Name filter: match either organisation_name OR user.username
        if (trimmedName) {
            organisationWhere[Op.or] = [
                {
                    organisation_name: {
                        [Op.like]: `%${trimmedName}%`
                    }
                },
                {
                    '$user.username$': {
                        [Op.like]: `%${trimmedName}%`
                    }
                }
            ];
        }

        if (type) {
            organisationWhere.organisation_type = {
                [Op.in]: Array.isArray(type) ? type : [type]
            };
        }

        // Specialization Filter Logic
        if (specializationQuery) {
            let specsArray = [];

            if (Array.isArray(specializationQuery)) {
                specsArray = specializationQuery.map((s) => s.trim().toLowerCase()).filter(Boolean);
            } else if (typeof specializationQuery === 'string') {
                specsArray = specializationQuery
                    .split(',')
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
            }

            if (specsArray.length > 0) {
                // Use sequelize.where + sequelize.col to avoid auto-quoting issues on JSON columns
                const specConditions = specsArray.map((spec) => 
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('organisationProfile.specializations_provided')),
                        {
                            [Op.like]: `%${spec}%`
                        }
                    )
                );

                // Combine with Op.and
                organisationWhere[Op.and] = specConditions;
            }
        }

        // Address filter
        const addressWhere = {};
        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        const { count, rows: organisations } = await organisationProfile.findAndCountAll({
            where: organisationWhere,
            limit: limit,
            offset: offset,
            distinct: true,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "email", "phone_number", "username"],
                    required: false // LEFT JOIN so matches on org name alone aren't excluded
                },
                {
                    model: address,
                    as: "address",
                    where: Object.keys(addressWhere).length > 0 ? addressWhere : undefined,
                    required: !!trimmedPincode // INNER JOIN only when filtering by pincode
                }
            ],
        });

        return res.status(200).json({
            success: true,
            total: count,
            limit,
            offset,
            organisations: organisations.length > 0 ? organisations : [],
            message: organisations.length === 0 ? "No organisations found matching the criteria." : "Organisations retrieved successfully"
        });
    } catch (error) {
        console.error("[DEBUG] Error Executing Query:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to filter organisations",
            details: error.message
        });
    }
};



const filterHospitalIdName = async (req, res) => {
    const {
        name,
    } = req.query;

    // Accept both parameter variations

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        const trimmedName = name ? name.trim() : "";

        // User filter
        const organisationWhere = {
            verified_status: true
        };

        // If trimmedName is provided, check if organisation_name OR user.username matches
        if (trimmedName) {
            organisationWhere[Op.or] = [
                {
                    organisation_name: {
                        [Op.like]: `%${trimmedName}%`
                    }
                },
                {
                    '$user.username$': {
                        [Op.like]: `%${trimmedName}%`
                    }
                }
            ];
        }

        const { count, rows: organisations } = await organisationProfile.findAndCountAll({
            where: organisationWhere,
            attributes: ['id', 'organisation_name'],
            limit: limit,
            offset: offset,
            distinct: true,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "email", "phone_number", "username"],
                    required: false // Ensures a LEFT OUTER JOIN so matches on org name alone aren't excluded
                }
            ],
        });

        return res.status(200).json({
            success: true,
            total: count,
            limit,
            offset,
            organisations: organisations.length > 0 ? organisations : [],
            message: organisations.length === 0 ? "No organisations found matching the criteria." : "Organisations retrieved successfully"
        });
    } catch (error) {
        console.error("[DEBUG] Error Executing Query:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to filter organisations",
            details: error.message
        });
    }
};

module.exports = { filterHospitals, filterHospitalIdName };