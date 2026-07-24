const {
    admin
} = require("../../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const loginAdmin = async (req, res) => {
    const {
        email,
        password
    } = req.body;

    // ✅ Client detection logic (identical to login.js)
    const clientType = (() => {
        if (req.headers && req.headers['x-client-type']) {
            return req.headers['x-client-type'];
        }
        if (req.headers && (req.headers.origin || req.headers.referer)) {
            return 'web';
        }
        return 'api';
    })();

    try {
        const existingAdmin = await admin.findOne({
            where: {
                email
            }
        });

        if (!existingAdmin) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const match = await bcrypt.compare(password, existingAdmin.password);
        if (!match) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        if (!existingAdmin.is_active) {
            return res.status(403).json({
                error: "Admin account is inactive"
            });
        }

        // Generate Token
        const token = jwt.sign({
                id: existingAdmin.id,
                email: existingAdmin.email,
                scope: "admin",
            },
            process.env.ADMIN_JWT_SECRET, {
                expiresIn: "1h"
            }
        );

        // 🌐 Browser → Set Cookie
        if (clientType === 'web') {
            res.cookie("AdminToken", token, {
                httpOnly: true,
                secure: true,
                sameSite: "None",
                domain: ".local.docapp",
                maxAge: 3600000, // 1 hour in ms
            });
        }

        // 📱 Mobile / API → Return token in JSON
        return res.status(200).json({
            message: "Login successful",
            token: token,
            clientType,
            admin: {
                id: existingAdmin.id,
                email: existingAdmin.email,
                role: "admin"
            }
        });

    } catch (err) {
        console.error("Admin Login Error:", err);
        res.status(500).json({
            error: "Server error"
        });
    }
};

module.exports = loginAdmin;