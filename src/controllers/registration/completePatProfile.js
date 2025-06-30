const { generalUser, User } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");


//api to complete the patient profile
const completePatientProfile = async (req, res) => {
  try {
    const { payload } = req.user;
    const { id } = payload;

    let user = await validateUserRole(id, "general_user", res);
    if (!user || user.error){
      return res.status(401).json({error:"user is not authorised to this route"})
    };


    let userExists = await User.findByPk(id);

    if (!userExists){
      createUserProfile(req, res)
    }else{
      updateUserProfile(req, res)
    }
  } catch (error) {
    console.error("Patient profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const createUserProfile = async (req, res)=>{
  const {date_of_birth, gender, profile_picture = "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270802/profile_11121549_dtesby.png"} = req.body
  if (!date_of_birth || !gender){
    return res.status(400).json({error:"all required fields are not satisfied"})
  }

  let valid_gender = ['Male', 'Female', 'Others']

  if (!valid_gender.includes(gender)){
    return res.status(400).json({error:"the value of gender is not valid"})
  }

  await generalUser.create({
    user_id:req.user.payload.id,
    date_of_birth,
    gender,
    profile_picture
  })

  return req.status(200).json({message:"succesfully created the user profile"})
}

const updateUserProfile = async (req, res)=>{
  const userProfileObj = await generalUser.findOne({where:{user_id:req.user.payload.id}})

  const {date_of_birth=userProfileObj.date_of_birth, gender=userProfileObj.gender, profile_picture=userProfileObj.profile_picture} = req.body

  let valid_gender = ['Male', 'Female', 'Others']

  if (!valid_gender.includes(gender)){
    return res.status(400).json({error:"the value of gender is not valid"})
  }

  await generalUser.update({
    user_id:req.user.payload.id,
    date_of_birth,
    gender,
    profile_picture
  }, {where:{user_id:req.user.payload.id}})

  return res.status(200).json({message:"succesfully updated user profile"})
}

module.exports = { completePatientProfile };
