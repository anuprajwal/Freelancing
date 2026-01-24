const {
    User
} = require("../../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
    Op
} = require("sequelize");


// the api to login any user 

const loginUser = async (req, res) => {
    const {
        email,
        phone_number, // Added phone_number
        password,
        role = "general_user"
    } = req.body;

    const user_ip = req.ip;

    // Check if password and role exist, and that AT LEAST one of email or phone_number is present
    if ((!email && !phone_number) || !password || !role) {
        return res.status(400).json({ // Changed to 400 (Bad Request)
            error: "Please provide email or phone number, and password."
        });
    }

    try {
        // Query logic: (email OR phone_number) AND role
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    email ? {
                        email
                    } : null,
                    phone_number ? {
                        phone_number
                    } : null
                ].filter(Boolean), // Filters out null values if one field is missing
                role
            }
        });

        if (!user) {
            return res.status(404).json({ // 404 is more descriptive for 'not found'
                error: "User not found"
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ // 401 is standard for Invalid Credentials
                error: "Invalid credentials"
            });
        }

        const token = generateToken(user, user_ip);

        // Setting the cookie
        res.cookie(`${role}_token`, token.token, { // Changed space to underscore for better cookie naming
            httpOnly: true,
            secure: true,
            sameSite: "None",
            domain: ".local.docapp",
            maxAge: parseInt(token.expiresIn, 10),
        });

        return res.status(200).json({
            message: "Login Success",
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            } // Optional: return basic user info
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            error: "Internal server error during login"
        });
    }
}


const generateToken = (user, user_ip) => {
    const token = jwt.sign({
        id: user.id,
        email: user.email,
        ip: user_ip,
        scope: user.role
    }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
    console.log("token generated for user", user.email, "id", token);
    console.log("token expires in:", process.env.JWT_EXPIRES_IN)
    return {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN
    };
}

module.exports = {
    loginUser,
    generateToken
};