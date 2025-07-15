const jwt = require("jsonwebtoken");

const verifyAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this token is for admin
    if (decoded.scope !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.admin = decoded; // { id, email, scope, ip }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired admin token" });
  }
};

module.exports = verifyAdminAuth;
