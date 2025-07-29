const { User, otpStorage } = require("../../../models");
const axios = require('axios');


const sendEmailOtp = async (req, res) => {
  const { id } = req.user.payload;

  const user = await User.findByPk(id)

  const email = user.email

  if (user.is_email_verified){
    return res.status(200).json({message:"Email already verified."})
  }

  if (!email){
    return res.status(400).json({ message: "Email is required" });
  } 
  
  let otp = Math.floor(100000 + Math.random() * 900000) + "";

  console.log("sending the otp:", otp)

  axios.post('http://127.0.0.1:5500/api/send-email', { to: email, subject: "verify your email", text: otp }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
  // store OTP in DB
  try{
    await otpStorage.destroy({
      where: {
        user_id: id,
      },
    });
    console.log(id, email, typeof otp)
    await otpStorage.create({
      user_id: id,
      email: email,
      otp,
    });
  }catch(e){
    console.log(`error recieved ${e}`)
    return res.status(500).json({ error: `Error in Server :${e}` });
  }
  
  res.status(200).json({ message: "OTP sent successfully" });
};

module.exports = sendEmailOtp;
