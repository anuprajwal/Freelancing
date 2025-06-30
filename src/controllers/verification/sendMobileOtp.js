const { User, otpStorage } = require("../../models");
const axios = require("axios");


const sendMobileOtp = async (req, res)=>{
    const { phoneNumber } = req.body;
    const { id } = req.user;

    const user = await User.findOne({ where: { phone_number: phoneNumber, id: id } });

    if(!user){
        return res.status(404).json({ message: "User not found with this phone number" });
    }

    if(user.is_phone_verified){
        return res.status(400).json({ message: "Phone already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const otpSender = await sendOtp(phoneNumber, otp, id);
    
    res.status(200).json({ message: "OTP sent successfully" });
    
}


const sendOtp = async (phoneNumber, otp, id)=>{
    const otpSender = await otpStorage.create({
        user_id: id,
        phone_number: phoneNumber,
        otp: otp
    });

    const message = `Your OTP is ${otp}. It is valid for 5 minutes.`;

    const payload = {
        route: 'otp',
        variables_values: otp,
        numbers: phoneNumber,
    };

    try {
        const response = await axios.post(
          'https://www.fast2sms.com/dev/bulkV2',
          payload,
          {
            headers: {
              'authorization': 'YOUR_FAST2SMS_API_KEY',
              'Content-Type': 'application/json',
            },
          }
        );
    
        console.log('SMS sent:', response.data);
        return true;
      } catch (err) {
        console.error('Error sending SMS:', err.response.data);
        return false;
    }

}

module.exports = { sendMobileOtp };