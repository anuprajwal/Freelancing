const {
    organisationProfile,
    address,
    User
} = require("../../../models");
const {
    Op
} = require('sequelize');

// The API to filter out verified organisations/hospitals with pagination and search
const filterHospitals = async (req, res) => {
    const {
        name,
        type = ["hospital", "clinic", "pharmacy", "laboratory"],
        pincode
    } = req.query;

    // Extract and parse limit and offset from query params
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    try {
        const trimmedName = name ? name.trim() : "";
        const trimmedPincode = pincode ? pincode.trim() : "";

        // User filter condition if name is passed
        const userWhere = {};
        if (trimmedName) {
            userWhere.username = {
                [Op.like]: `%${trimmedName}%`
            };
        }

        // Address filter condition if pincode is passed
        const addressWhere = {};
        if (trimmedPincode) {
            addressWhere.pincode = {
                [Op.like]: `%${trimmedPincode}%`
            };
        }

        const { count, rows: organisations } = await organisationProfile.findAndCountAll({
            where: {
                ...(type ? {
                    organisation_type: {
                        [Op.in]: Array.isArray(type) ? type : [type]
                    }
                } : {}),
                verified_status: true
            },
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
                    required: !!trimmedPincode
                }
            ]
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
        console.log(error);
        return res.status(500).json({
            success: false,
            error: "Failed to filter organisations",
            details: error.message
        });
    }
};

module.exports = filterHospitals;