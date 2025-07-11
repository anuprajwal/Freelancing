// this is the basic user registration mapping to ../models/user.js
const {User, generalUser, doctorProfile, organisationProfile} = require("../../../models");
const bcrypt = require("bcrypt");
const {generateToken} = require("../login/login");


// basic gateway api where user regesteres with a email or phone number
 const registerUser = async (req, res) => {
  try {
    const { username, email, phone_number, password, role } = req.body;

    console.log(User)

    // Validate required fields
    if (!username || !email || !phone_number || !password || !role) {
      console.log(req.body);
      
      return res.status(400).json({ error: "All fields are required" });
    }


    const existingUser = await User.findOne({
      where :{
        email,
        phone_number,
        role
      }
    });

    if(existingUser){
      return res.status(409).json({
        error : `User already exists with this email and phone number as a ${role}`
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      phone_number,
      password_hash: hashedPassword,
      role,
      is_active: false, 
    });

    if (role === "general_user"){
      createUserProfile(user.id)
    }else if(role === "doctor"){
      createDoctorProfile(user.id)
    }else if (role === "hospital_organisation"){
      createHospitalProfile(user.id)
    }


    const token = generateToken(user, req.ip);

    res.cookie("token", token.token, {
      httpOnly: true,  
      secure: false,   
      sameSite: "Strict",
      maxAge: token.expiresIn, 
  });

    res.status(201).json({
      message: "User registered. Complete profile next.",
      userId: user.id,
      next_step_url: `/profile/complete/${user.role}`, 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const createUserProfile = async (id)=>{
  await generalUser.create({
    user_id : id,
    profile_picture : "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270802/profile_11121549_dtesby.png"
  })
}

const createDoctorProfile = async(id)=>{
  await doctorProfile.create({
    user_id : id,
    profile_picture : "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png"
  })
}


const createHospitalProfile = async  (id) =>{
  await organisationProfile.create({
    user_id : id,
    profile_picture : "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270847/hospital-building_4821512_qr0gvo.png"
  })
}

module.exports = registerUser