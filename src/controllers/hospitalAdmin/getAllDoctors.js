const { Op } = require("sequelize");

const {
    User,
    doctorProfile,
    organisationRequest
} = require("../../../models");

const getAllDoctors = async (req, res) => {
    try {

        const { org_id } = req.user.payload;

        if (!org_id) {
            return res.status(404).json({
                error: "Organisation profile not found."
            });
        }

        let {
            page = 1,
            limit = 10,
            search = "",
            verified,
            request_status
        } = req.query;

        page = Number(page);
        limit = Number(limit);

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;

        const offset = (page - 1) * limit;

        const allowedStatus = [
            "pending",
            "accepted",
            "rejected"
        ];

        
        if (
            request_status &&
            !allowedStatus.includes(request_status)
        ) {

            return res.status(400).json({
                error:"Invalid request status."
            });

        }

        //-----------------------------------------
        // USER FILTER
        //-----------------------------------------

        const userWhere = {
            role: "doctor"
        };

        if (search.trim()) {

            userWhere[Op.or] = [

                {
                    email: {
                        [Op.like]: `%${search}%`
                    }
                },

                {
                    username: {
                        [Op.like]: `%${search}%`
                    }
                },

                {
                    phone_number: {
                        [Op.like]: `%${search}%`
                    }
                }

            ];

        }

        //-----------------------------------------
        // DOCTOR PROFILE FILTER
        //-----------------------------------------

        const doctorProfileWhere = {};

        if (verified === "true") {
            doctorProfileWhere.verified_status = true;
        }

        if (verified === "false") {
            doctorProfileWhere.verified_status = false;
        }

        //-----------------------------------------
        // ORGANISATION REQUEST FILTER
        //-----------------------------------------

        const organisationWhere = {
            org_id
        };

        if (
            request_status &&
            ["pending", "accepted", "rejected"].includes(request_status)
        ) {
            organisationWhere.request_status = request_status;
        }

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

                    required: false,

                    where:
                        Object.keys(doctorProfileWhere).length
                            ? doctorProfileWhere
                            : undefined
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

        console.error(err);

        return res.status(500).json({

            error: "Something went wrong while fetching doctors."

        });

    }
};

module.exports = getAllDoctors;