
const {
    admin
} = require("../../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const registerAdmin = async (req, res) => {
    const {
        name,
        email,
        password
    } = req.body;

    // ✅ Client detection logic
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
        if (!name || !email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const existingAdmin = await admin.findOne({
            where: {
                email
            }
        });
        if (existingAdmin) {
            return res.status(400).json({
                error: "Admin with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await admin.create({
            name,
            email,
            password: hashedPassword,
            is_active: true,
        });

        const token = jwt.sign({
                id: newAdmin.id,
                email: newAdmin.email,
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
                maxAge: 3600000,
            });
        }

        // 📱 Mobile / API → Return token in JSON
        return res.status(201).json({
            message: "Admin registered successfully",
            token: clientType !== 'web' ? token : undefined,
            clientType,
            admin: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email
            }
        });

    } catch (err) {
        console.error("Error registering admin:", err);
        res.status(500).json({
            error: "Server error"
        });
    }
};

module.exports = registerAdmin;