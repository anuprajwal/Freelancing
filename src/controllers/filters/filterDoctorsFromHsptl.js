const { Op } = require("sequelize");
const {
    User,
    doctorProfile,
    organisationRequest
} = require("../../../models");

/**
 * getDoctorsByOrganisation
 * Query parameters:
 *  - org_id (or via route params / auth token fallback)
 *  - search (optional: matches username, email, or phone_number)
 *  - page (optional, default: 1)
 *  - limit (optional, default: 10)
 */
const getDoctorsByOrganisation = async (req, res) => {
    try {
        // Accept org_id from query params, route params, or user payload
        const org_id = req.query.org_id || req.params.org_id || req.user?.payload?.org_id;

        if (!org_id) {
            return res.status(400).json({
                error: "Organisation ID (org_id) is required."
            });
        }

        let {
            page = 1,
            limit = 10,
            search = ""
        } = req.query;

        page = Number(page);
        limit = Number(limit);

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;

        const offset = (page - 1) * limit;

        //-----------------------------------------
        // USER FILTER & SEARCH
        //-----------------------------------------
        const userWhere = {
            role: "doctor"
        };

        if (search && search.trim()) {
            userWhere[Op.or] = [
                {
                    email: {
                        [Op.like]: `%${search.trim()}%`
                    }
                },
                {
                    username: {
                        [Op.like]: `%${search.trim()}%`
                    }
                },
                {
                    phone_number: {
                        [Op.like]: `%${search.trim()}%`
                    }
                }
            ];
        }

        //-----------------------------------------
        // ORGANISATION FILTER
        //-----------------------------------------
        const organisationWhere = {
            org_id
        };

        //-----------------------------------------
        // QUERY
        //-----------------------------------------
        const doctors = await User.findAndCountAll({
            where: userWhere,
            attributes: [
                "id",
                "username",
                "email",
                "phone_number",
                "account_status",
                "is_email_verified",
                "is_phone_verified",
                "created_at"
            ],
            include: [
                {
                    model: doctorProfile,
                    as: "doctorProfile",
                    required: false
                },
                {
                    model: organisationRequest,
                    as: "organisationRequests",
                    required: true,
                    where: organisationWhere
                }
            ],
            distinct: true,
            order: [["created_at", "DESC"]],
            limit,
            offset
        });

        return res.status(200).json({
            message: "Doctors fetched successfully.",
            pagination: {
                page,
                limit,
                total_records: doctors.count,
                total_pages: Math.ceil(doctors.count / limit)
            },
            doctors: doctors.rows
        });

    } catch (err) {
        console.error("[getDoctorsByOrganisation Error]:", err);
        return res.status(500).json({
            error: "Something went wrong while fetching doctors for this organisation.",
            details: err.message
        });
    }
};

module.exports = getDoctorsByOrganisation;