// this is the basic user registration mapping to ../models/user.js
const {
    User,
    generalUser,
    doctorProfile,
    organisationProfile
} = require("../../../models");
const bcrypt = require("bcrypt");
const {
    generateToken
} = require("../login/login");
const createS3UserFolders = require("../savingSpaces/createUserSpace")
const {
    Op
} = require("sequelize")


// basic gateway api where user regesteres with a email or phone number
const registerUser = async (req, res) => {
    try {
        const {
            username,
            email,
            phone_number,
            password,
            role
        } = req.body;

        // Validate required fields
        if (!username || !email || !phone_number || !password || !role) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }


        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{
                        email: email,
                        role: role
                    },
                    {
                        phone_number: phone_number,
                        role: role
                    }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                error: `User already exists with this email and phone number as a ${role}`
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            email,
            phone_number,
            password_hash: hashedPassword,
            role,
            is_active: false,
        });

        if (role === "general_user") {
            createUserProfile(user.id)
        } else if (role === "doctor") {
            createDoctorProfile(user.id)
        } else if (role === "hospital_organisation") {
            createHospitalProfile(user.id)
        }


        const token = generateToken(user, req.ip);

        res.cookie(`${role}_token`, token.token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            domain: ".local.docapp",
            maxAge: token.expiresIn,
        });

        const emailUnique = email.split('@')

        createS3UserFolders("user-profile-pics-docapp", `${role}_${emailUnique}_${phone_number}_main_folder`)

        res.status(201).json({
            message: "User registered. Complete profile next.",
            userId: user.id,
            next_step_url: `/profile/complete/${user.role}`,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
};


const createUserProfile = async (id) => {
    await generalUser.create({
        user_id: id,
        profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270802/profile_11121549_dtesby.png"
    })
}

const createDoctorProfile = async (id) => {
    await doctorProfile.create({
        user_id: id,
        profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png",
    })
}


const createHospitalProfile = async (id) => {
    await organisationProfile.create({
        user_id: id,
        profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270847/hospital-building_4821512_qr0gvo.png"
    })
}

module.exports = registerUser