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
  
  const otp = Math.floor(100000 + Math.random() * 900000);

  

  // store OTP in DB
  try{
    await otpStorage.create({
    user_id: id,
    email: email,
    otp: otp,
  });
  }catch(e){
    console.log(`error recieved ${e}`)
    return res.status(500).json({ error: `Error in Server :${e}` });
  }
  
  res.status(200).json({ message: "OTP sent successfully" });
};

module.exports = sendEmailOtp;
