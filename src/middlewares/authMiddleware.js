const jwt = require('jsonwebtoken');
const {
    loginUserForm
} = require('../controllers/login/login');

const EXCLUDED_ROUTES = ['/register', '/auth/login'];


// const protect = (req, res, next) => {
//     try {
//         console.log("Requested path:", req.path);

//         // Skip auth for excluded routes
//         if (EXCLUDED_ROUTES.includes(req.path)) {
//             return next();
//         }
//         // Detect request origin
//         let origin = null;

//         if (req.headers && req.headers.origin) {
//             origin = req.headers.origin;
//         } else if (req.headers && req.headers.referer) {
//             origin = req.headers.referer.replace(/\/$/, '');
//         }

//         let token = null;
//         let tokenKey = null;

//         // 🌐 Browser
        
//         if (
//             req.headers &&
//             req.headers.authorization &&
//             req.headers.authorization.startsWith('Bearer ')
//         ) {
//             token = req.headers.authorization.split(' ')[1];
//         }
        

//         if (!token) {
//             console.log("token not found")
//             return res.status(401).json({
//                 error: "Auth token not found"
//             });
//         }


//         // Verify JWT
//         const decoded = decodeToken(token);

//         if (decoded.error) {
//             return res.status(403).json({
//                 error: decoded.error
//             });
//         }

//         // Optional IP validation (if enabled later)
//         /*
//         if (decoded.payload.ip !== req.ip) {
//             return res.status(403).json({
//                 error: "IP changed. Login required"
//             });
//         }
//         */

//         // Attach user info
//         req.user = decoded,

//         next();

//     } catch (err) {
//         console.error("Auth middleware error:", err);
//         res.status(500).json({
//             error: "Internal server error"
//         });
//     }
// };

// JWT decoder


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
            origin = req.headers.referer;
        }

        let token = null;

        // 🌐 Browser
        if (
            req.headers &&
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.log("token not found");
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

        // --- ROLE & URL VALIDATION START ---

        // Define expected domain mapping per role
        const roleDomainMap = {
            general_user: 'users.docapp.co.in',
            doctor: 'doctors.docapp.co.in', // Corrected minor typo from doctors_docapp.co.in
            hospital_organisation: 'hospitals.docapp.co.in'
        };

        const userRole = decoded.payload?.role || decoded.role; // Adjust based on your decodeToken structure

        if (!origin) {
            return res.status(403).json({
                error: "Unauthorized access: Missing origin or referer header"
            });
        }

        // Extract hostname safely from origin/referer (handles http://, https://, ports, and subpaths)
        let requestHost = '';
        try {
            requestHost = new URL(origin).hostname;
        } catch (e) {
            return res.status(400).json({
                error: "Invalid Origin or Referer header"
            });
        }

        const expectedDomain = roleDomainMap[userRole];

        // Check if role is recognized and request host matches expected domain
        if (!expectedDomain || requestHost !== expectedDomain) {
            return res.status(403).json({
                error: "Unauthorized access for this domain"+requestHost+" expected "+expectedDomain+" role "+userRole
            });
        }

        // --- ROLE & URL VALIDATION END ---

        // Attach user info (Fixed syntax error: comma replaced with semicolon)
        req.user = decoded;

        next();

    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(500).json({
            error: "Internal server error"
        });
    }
};


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