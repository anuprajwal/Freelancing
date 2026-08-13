const jwt = require('jsonwebtoken');

const verifyToken = (req, res) => {
    // 1. Get token from cookies
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            authenticated: false,
            message: "No token provided"
        });
    }

    try {
        // 2. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Return success
        return res.status(200).json({
            authenticated: true,
            user: decoded
        });
    } catch (err) {
        return res.status(401).json({
            authenticated: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = {
    verifyToken
};