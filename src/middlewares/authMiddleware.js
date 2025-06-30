const jwt = require('jsonwebtoken');
const { loginUserForm } = require('../controllers/login/login');


// middleware to authenticate user baseed on his jwt.
// token is to be authorised based on the ip of the user. but it is neglected as it is in developement for now.
const protect = (req, res, next) => {
// Define the routes to exclude from authentication
// yahan pe wo saare dalo jisme jwt token nh dena hai
    const excludedRoutes = '/register';
    const excludedRoutes1 = '/auth/login';
    
    console.log("requested to path: ",req.path);
    
    // Check if the current request path is one of the excluded routes
    if (req.path == excludedRoutes || req.path == excludedRoutes1) {
        return next(); // Skip authentication and proceed to the next middleware or route handler
    }


    const user_ip = req.ip;
    let authToken = req.cookies.token;
    console.log('cookie:',req.cookies)
    console.log('token:',req.cookies.token)
    
    if (!authToken) {
        return res.status(401).json({error: "token not found"});
    }

    console.log("token found")

    
    const decoded = decodeToken(authToken);

    console.log("token decoaded")
    if (!decoded) {
        return res.status(403).json({error: decoded.error});
    }

    console.log("token present")
    if (decoded.error) {
        return res.status(403).json({error: decoded.error});
    }
    console.log("no errors in token")
    if (decoded.payload && decoded.payload.ip !== user_ip) {
        return res.status(403).json({error: "IP changed. Login needed"});
    }

    console.log("ip is same")

    req.user = decoded;
    console.log("redirecting from middleware")
    next();
    
};


// function to decode the jwt token
const decodeToken = (token) => {
    try {
        return {payload: jwt.verify(token, process.env.JWT_SECRET), error: null};
    } catch (error) {
        return {payload: null, error: error.message};
    }
}


module.exports = protect