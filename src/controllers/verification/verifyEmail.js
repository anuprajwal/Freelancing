const { User, otpStorage } = require("../../../models");

const verifyEmail = async (req, res) => {
  const { email, userOtp } = req.body;
  const { id } = req.user;

  if (!email || !userOtp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await User.findOne({ where: { email: email, id: id } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.is_email_verified) {
    return res.status(400).json({ message: "Email already verified" });
  }

  const otp = await otpStorage.findOne({ where: { user_id: id, email: email } });

  if (!otp) {
    return res.status(404).json({ message: "OTP not found or expired" });
  }

  if (otp.otp !== userOtp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  try {
    user.is_email_verified = true;
    await user.save();
    await otp.destroy();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Error verifying email:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports =  verifyEmail ;
