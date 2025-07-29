const jwt = require("jsonwebtoken");

const verifyAdminAuth = (req, res, next) => {
  const authHeader = req.cookies.token;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  try {
    const decoded = decodeToken(authHeader)


    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired admin token" });
  }
};

const decodeToken = (token) => {
  try {
      return {payload: jwt.verify(token, process.env.JWT_SECRET), error: null};
  } catch (error) {
      return {payload: null, error: error.message};
  }
}


module.exports = verifyAdminAuth;
