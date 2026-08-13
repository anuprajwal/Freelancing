const {
    User,
    generalUser,
    doctorProfile,
    organisationProfile
} = require("../../../models");

const getUserDetails = async (req, res) => {
    try {
        const {
            id
        } = req.user.payload

        if (!id) {
            return res.status(400).json({
                error: "user doesn't sseem to be logged in"
            })
        }

        const user = await User.findByPk(id, {
            attributes: [
                'id',
                'username',
                'email',
                'phone_number',
                'role',
                'is_email_verified',
                'is_phone_verified'
            ]
        });

        if (!user) {
            throw new Error("User not found");
        }

        const includes = [];


        if (user.role === "general_user") {
            includes.push({
                model: generalUser,
                as: "generalUser",
                attributes: {
                    exclude: [
                        'user_id',
                        'created_at',
                        'updated_at'
                    ]
                }
            });
        }

        if (user.role === "doctor") {
            includes.push({
                model: doctorProfile,
                as: "doctorProfile",
                attributes: {
                    exclude: [
                        'user_id',
                        'created_at',
                        'updated_at'
                    ]
                }
            });
        }

        if (user.role === "hospital_organisation") {
            includes.push({
                model: organisationProfile,
                as: "organisationProfile"
            });
        }



        const userDetails = await User.findByPk(id, {
            attributes: [
                'id',
                'username',
                'email',
                'phone_number',
                'role',
                'is_email_verified',
                'is_phone_verified'
            ],
            include: includes
        });


        res.status(200).json({
            message: "succesfully fetched the user details",
            userData: userDetails
        })
    } catch (e) {
        console.error("Error fetching user details:", e);
        return res.status(500).json({
            error: "Unexpected error in the server"
        })
    }

}

module.exports = getUserDetails