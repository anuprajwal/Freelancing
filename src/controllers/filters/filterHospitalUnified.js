const { literal, Op } = require("sequelize");
const {
    organisationProfile,
    address,
    User,
    sequelize // Ensure sequelize instance is imported for custom queries
} = require("../../../models");


const filterHospitalsCombined = async (req, res) => {
    const {
        name,
        type = ["hospital", "clinic", "pharmacy", "laboratory"],
        pincode,
        userLatitude,
        userLongitude,
        filterInMeters = 5000,
    } = req.query;

    // Accept both parameter variations
    const specializationQuery = req.query.specializations_provided || req.query.specialization;

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        const trimmedName = name ? name.trim() : "";
        const trimmedPincode = pincode ? pincode.trim() : "";
        const parsedLat = parseFloat(userLatitude) || null;
        const parsedLng = parseFloat(userLongitude) || null;
        const maxDistanceMeters = parseInt(filterInMeters, 10) || 5000;

        // Base filter condition on organisationProfile
        const organisationWhere = {
            verified_status: true
        };

        // 1. Name Filter: match either organisation_name OR user.username
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

        // 2. Organisation Type Filter
        if (type) {
            organisationWhere.organisation_type = {
                [Op.in]: Array.isArray(type) ? type : [type]
            };
        }

        // 3. Specialization Filter Logic
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
                const specConditions = specsArray.map((spec) =>
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('organisationProfile.specializations_provided')),
                        {
                            [Op.like]: `%${spec}%`
                        }
                    )
                );

                organisationWhere[Op.and] = specConditions;
            }
        }

        // 4. User Where Clause (Location Distance Match)
        const isGeoSearchActive = parsedLat !== null && parsedLng !== null;
        const userWhere = {};
        let attributesInclude = [];
        let orderClause = [];

        if (isGeoSearchActive) {
            // Mysql distance calculation referencing latitude/longitude directly on the User model (`user` alias)
            const distanceFormula = `
                ST_Distance_Sphere(
                    Point(\`user\`.\`longitude\`, \`user\`.\`latitude\`),
                    Point(${parsedLng}, ${parsedLat})
                )
            `;

            attributesInclude.push([literal(distanceFormula), "distance"]);

            // Apply distance filter directly inside userWhere
            userWhere[Op.and] = userWhere[Op.and] || [];
            userWhere[Op.and].push(literal(`${distanceFormula} <= ${maxDistanceMeters}`));

            // Sort by nearest distance using the projected 'distance' alias
            orderClause.push([literal('distance'), 'ASC']);
        }

        // 5. Address Where Clause (Pincode Match)
        const addressWhere = {};
        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        // Execute combined query
        const { count, rows: organisations } = await organisationProfile.findAndCountAll({
            attributes: {
                include: attributesInclude
            },
            where: organisationWhere,
            limit: limit,
            offset: offset,
            distinct: true,
            order: orderClause.length > 0 ? orderClause : undefined,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "email", "phone_number", "username", "role", "latitude", "longitude"],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    // Inner join User if spatial geolocation search is active
                    required: isGeoSearchActive
                },
                {
                    model: address,
                    as: "address",
                    where: Object.keys(addressWhere).length > 0 ? addressWhere : undefined,
                    // Inner join address table ONLY when filtering by pincode
                    required: !!trimmedPincode
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
        console.error("[DEBUG] Error Executing Combined Hospital Query:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to filter organisations",
            details: error.message
        });
    }
};

module.exports = filterHospitalsCombined