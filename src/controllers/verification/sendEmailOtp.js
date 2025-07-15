const { User, otpStorage } = require("../../../models");

const sendEmailOtp = async (req, res) => {
  const { id } = req.user.payload;

  const user = User.findByPk(id)

  const email = user.email

  if (user.is_email_verified){
    return res.status(200).json({message:"Email already verified."})
  }

  if (!email){
    return res.status(400).json({ message: "Email is required" });
  } 

  if (!user) {
    return res.status(404).json({ message: "User not found with this email" });
  }

  if (user.is_email_verified) {
    return res.status(400).json({ message: "Email already verified" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  // store OTP in DB
  await otpStorage.create({
    user_id: id,
    email: email,
    otp: otp,
  });

  // placeholder
  if (!sent) {
    return res.status(500).json({ message: "Failed to send OTP" });
  }

  res.status(200).json({ message: "OTP sent successfully" });
};

module.exports = sendEmailOtp;
