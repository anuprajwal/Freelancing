const { User, otpStorage } = require("../../models");


const verifyPhone = async (req, res)=>{
    const { phoneNumber, userOtp } = req.body;
    const { id } = req.user;

    const user = await User.findOne({ where: { phone_number: phone, id: id } });

    if(!phoneNumber || !userOtp){
        return res.status(400).json({ message: "Phone number and user OTP are required" });
    }

    if(!user){
        return res.status(404).json({ message: "User not found" });
    }

    if (user.is_phone_verified){
        return res.status(400).json({ message: "Phone already verified" });
    }

    const otp = await otpStorage.findOne({ where: { user_id: id, phone_number: phoneNumber } });

    if(!otp){
        return res.status(404).json({ message: "OTP not found" });
    }
    
    try{
        if(otp.opt !== userOtp){
            return res.status(400).json({ message: "Invalid OTP" });
        }else{
            user.is_phone_verified = true;
            await user.save();
            await otp.destroy();
        }
        res.status(200).json({ message: "Phone verified successfully" });
    }catch(error){
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports = { verifyPhone };
