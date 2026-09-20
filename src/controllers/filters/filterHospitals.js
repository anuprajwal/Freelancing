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
    // 1. Debug incoming query parameters
    console.log("=============== [DEBUG] INCOMING QUERY ===============");
    console.log("req.query:", req.query);

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

        // User filter
        const userWhere = {};
        if (trimmedName) {
            userWhere.username = {
                [Op.like]: `%${trimmedName}%`
            };
        }

        // Address filter
        const addressWhere = {};
        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        // Base filter condition
        const organisationWhere = {
            verified_status: true
        };

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

            console.log("[DEBUG] Extracted Specializations Array:", specsArray);

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

                // Combine with Op.and (or Op.or depending on matching requirements)
                organisationWhere[Op.and] = specConditions;
            }
        }

        console.log("[DEBUG] Compiled organisationWhere:", JSON.stringify(organisationWhere, null, 2));

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
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    required: !!trimmedName
                },
                {
                    model: address,
                    as: "address",
                    where: Object.keys(addressWhere).length > 0 ? addressWhere : undefined,
                    required: !!trimmedPincode // Returns null if no match and not required
                }
            ],
            logging: (sql) => console.log("[DEBUG] Executed Raw SQL Query:\n", sql) // Logs exact executed SQL
        });

        console.log(`[DEBUG] Results Found: Count=${count}, Rows=${organisations.length}`);
        console.log("=======================================================");

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

module.exports = filterHospitals;