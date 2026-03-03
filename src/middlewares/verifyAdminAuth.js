// //needs updtation
// const jwt = require("jsonwebtoken");

// const verifyAdminAuth = (req, res, next) => {
//   const authHeader = req.cookies.AdminToken;

//   if (!authHeader) {
//     return res.status(401).json({ error: "Missing or malformed token" });
//   }

//   try {
//     const decoded = decodeToken(authHeader)


//     req.admin = decoded;
//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid or expired admin token" });
//   }
// };

// const decodeToken = (token) => {
//   try {
//       return {payload: jwt.verify(token, process.env.ADMIN_JWT_SECRET), error: null};
//   } catch (error) {
//       return {payload: null, error: error.message};
//   }
// }


// module.exports = verifyAdminAuth;



const jwt = require("jsonwebtoken");


const verifyAdminAuth = (req, res, next) => {
    try {
        let token = null;
        let origin = null;

        // 1. Detect Request Origin (to distinguish Browser vs. Mobile)
        if (req.headers && req.headers.origin) {
            origin = req.headers.origin;
        } else if (req.headers && req.headers.referer) {
            origin = req.headers.referer.replace(/\/$/, '');
        }

        // 2. Extract Token based on source
        if (origin) {
            // 🌐 Source: Browser (Expect token in Cookies)
            // Note: Ensure cookie-parser middleware is used in your main app
            if (req.cookies && req.cookies.AdminToken) {
                token = req.cookies.AdminToken;
            }
        } else {
            // 📱 Source: Mobile / Postman / API (Expect token in Authorization Header)
            if (
                req.headers &&
                req.headers.authorization &&
                req.headers.authorization.startsWith('Bearer ')
            ) {
                token = req.headers.authorization.split(' ')[1];
            }
        }

        // 3. Fail fast if no token is found
        if (!token) {
            return res.status(401).json({
                error: "Authentication token missing. Please log in as admin."
            });
        }

        // 4. Verify JWT
        const decoded = decodeToken(token);

        if (decoded.error) {
            return res.status(403).json({
                error: `Invalid or expired admin token: ${decoded.error}`
            });
        }

        // 5. Attach admin data to request and proceed
        // Using .payload to match your decodeToken structure
        req.admin = decoded.payload;

        console.log("Admin Auth success:", req.admin.id || "Admin");
        next();

    } catch (err) {
        console.error("Admin Auth Middleware Error:", err);
        return res.status(500).json({
            error: "Internal server error during authentication"
        });
    }
};

/**
 * JWT decoder helper
 */
const decodeToken = (token) => {
    try {
        return {
            payload: jwt.verify(token, process.env.ADMIN_JWT_SECRET),
            error: null
        };
    } catch (error) {
        return {
            payload: null,
            error: error.message
        };
    }
};

module.exports = verifyAdminAuth;