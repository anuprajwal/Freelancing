const { User, otpStorage } = require("../../../models");
const axios = require("axios");

const sendPhoneOtp = async (req, res) => {
  try {
    const { id } = req.user.payload;

    // Fetch user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const phoneNumber = user.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    if (user.is_phone_verified) {
      return res.status(200).json({ message: "Phone already verified." });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ---- SMS CONFIG FROM ENV ----
    const smsURL = "https://www.fast2sms.com/dev/bulkV2";

    const params = {
      authorization: process.env.FAST2SMS_API_KEY,
      sender_id: process.env.FAST2SMS_SENDER_ID,
      message: process.env.FAST2SMS_TEMPLATE_ID,
      route: process.env.FAST2SMS_ROUTE || "otp",
      variables_values: otp,
      numbers: phoneNumber,
      flash: "0",
    };

    // ---- SEND SMS ----
    try {
      const response = await axios.get(smsURL, { params });
    } catch (error) {
      console.error("SMS sending error:", error.response?.data || error.message);
      return res.status(500).json({ message: "Failed to send SMS OTP" });
    }

    // ---- SAVE OTP ----
    await otpStorage.destroy({ where: { user_id: id } });

    await otpStorage.create({
      user_id: id,
      phone_number: phoneNumber,
      otp: otp,
    });

    return res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("sendPhoneOtp error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = sendPhoneOtp;
