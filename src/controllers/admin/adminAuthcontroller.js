const { admin } = require("../../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingAdmin = await admin.findOne({ where: { email } });

    if (!existingAdmin) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, existingAdmin.password);

    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!existingAdmin.is_active) {
      return res.status(403).json({ error: "Admin account is inactive" });
    }

    const token = jwt.sign(
      {
        id: existingAdmin.id,
        email: existingAdmin.email,
        scope: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports =  loginAdmin ;
