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
        phone_number,
        password,
        role = "general_user"
    } = req.body;

    const clientType = req.headers['x-client-type'] || 'web';
    const user_ip = req.ip;

    if ((!email && !phone_number) || !password || !role) {
        return res.status(400).json({
            error: "Please provide email or phone number, and password."
        });
    }

    try {
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    email ? {
                        email
                    } : null,
                    phone_number ? {
                        phone_number
                    } : null
                ].filter(Boolean),
                role
            }
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                error: "Invalid credentials"
            });
        }

        const token = generateToken(user, user_ip);

        // 🌐 Browser → cookie
        if (clientType === 'web') {
            res.cookie(`${role}_token`, token.token, {
                httpOnly: true,
                secure: true,
                sameSite: "None",
                domain: ".local.docapp",
                maxAge: parseInt(token.expiresIn, 10),
            });
        }

        // 📱 Mobile / Postman → token in body
        return res.status(200).json({
            message: "Login Success",
            token: clientType !== 'web' ? token.token : undefined,
            expiresIn: token.expiresIn,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            error: "Internal server error during login"
        });
    }
};



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