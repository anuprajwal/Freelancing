const jwt = require('jsonwebtoken');
const {
    loginUserForm
} = require('../controllers/login/login');

const DOMAIN_TOKEN_MAP = {
    [process.env.PATIENT_APP_URL]: 'general_user_token',
    [process.env.DOCTOR_APP_URL]: 'doctor_token',
    [process.env.HOSPITAL_APP_URL]: 'hospital_token'
};

const EXCLUDED_ROUTES = ['/register', '/auth/login'];
// middleware to authenticate user baseed on his jwt.
// token is to be authorised based on the ip of the user. but it is neglected as it is in developement for now.


const protect = (req, res, next) => {
    try {
        console.log("Requested path:", req.path);

        // Skip auth for excluded routes
        if (EXCLUDED_ROUTES.includes(req.path)) {
            return next();
        }
        // Detect request origin
        let origin = null;

        if (req.headers && req.headers.origin) {
            origin = req.headers.origin;
        } else if (req.headers && req.headers.referer) {
            origin = req.headers.referer.replace(/\/$/, '');
        }

        let token = null;
        let tokenKey = null;

        // 🌐 Browser
        
        if (
            req.headers &&
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }
        

        if (!token) {
            console.log("token not found")
            return res.status(401).json({
                error: "Auth token not found"
            });
        }


        // Verify JWT
        const decoded = decodeToken(token);

        if (decoded.error) {
            return res.status(403).json({
                error: decoded.error
            });
        }

        // Optional IP validation (if enabled later)
        /*
        if (decoded.payload.ip !== req.ip) {
            return res.status(403).json({
                error: "IP changed. Login required"
            });
        }
        */

        // Attach user info
        req.user = decoded,

        next();

    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
};

// JWT decoder
const decodeToken = (token) => {
    try {
        return {
            payload: jwt.verify(token, process.env.JWT_SECRET),
            error: null
        };
    } catch (error) {
        return {
            payload: null,
            error: error.message
        };
    }
};

module.exports = protect;