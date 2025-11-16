const { User, otpStorage } = require("../../models");

const verifyOtp = async (req, res) => {
  try {
    const { email, phoneNumber, userOtp } = req.body;
    const userId = req.user?.id || req.user?.payload?.id; // supports both types of JWT payload

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    // Validate request
    if (!userOtp || (!email && !phoneNumber)) {
      return res.status(400).json({
        message: "Provide either (email + otp) or (phoneNumber + otp)"
      });
    }

    // Find the user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let whereCondition = { user_id: userId };

    // Determine verification type
    let verificationType = "";

    if (email) {
      verificationType = "email";
      whereCondition.email = email;

      if (user.email !== email) {
        return res.status(400).json({
          message: "Email does not match your registered email"
        });
      }

      if (user.is_email_verified) {
        return res.status(400).json({ message: "Email already verified" });
      }
    }

    if (phoneNumber) {
      verificationType = "phone";
      whereCondition.phone_number = phoneNumber;

      if (user.phone_number !== phoneNumber) {
        return res.status(400).json({
          message: "Phone number does not match your registered number"
        });
      }

      if (user.is_phone_verified) {
        return res.status(400).json({ message: "Phone already verified" });
      }
    }

    // Try to find OTP
    const otpEntry = await otpStorage.findOne({ where: whereCondition });

    if (!otpEntry) {
      return res.status(404).json({ message: "OTP not found or expired" });
    }

    // Compare OTP
    if (otpEntry.otp !== userOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update verification status
    if (verificationType === "email") {
      user.is_email_verified = true;
    } else if (verificationType === "phone") {
      user.is_phone_verified = true;
    }

    await user.save();
    await otpEntry.destroy();

    return res.status(200).json({
      message: `${
        verificationType === "email" ? "Email" : "Phone"
      } verified successfully`
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = verifyOtp;
