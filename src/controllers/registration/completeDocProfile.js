const { error } = require("winston");
const { doctorProfile } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");
const { messaging } = require("firebase-admin");


// api to complete doctor profile
const completeDoctorProfile = async (req, res) => {
  try {
    const { payload } = req.user; 
    const { id } = payload;
    
    const user = await validateUserRole(id, "doctor", res);
    if (!user){
      return res.status(401).json({error:"user is not authorised to this route"})
    }
    else if(user.error){
      return res.status(401).json({error:user.error})
    }

    const doctorObj = await doctorProfile.findOne({where:{user_id:id}})

    if (!doctorObj){
      createDoctorProfile(req, res)
    }else{
      updateDoctorProfile(req, res, doctorObj)
    }

    let doctorExists  = await doctorProfile.findOne({where : {user_id : id}})
    if(!doctorExists){
        await createDoctorProfile(req, res)
    }
    else{
        await updateDoctorProfile(req, res)
    }
    

    // Mark doctor profile as completed
    await user.update({ is_active: true });

    res.status(200).json({ message: "Profile updated successfully", doctorExists });
  } catch (error) {
    console.error("Doctor profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


const updateDoctorProfile = async (req, res, doctorObj)=>{
  const {date_of_birth = doctorObj.date_of_birth, gender=doctorObj.gender, profile_picture=doctorObj.profile_picture, specialization=doctorObj.specialization, organisation_id=doctorObj.organisation_id, license_number=doctorObj.license_number } = req.body

  if (!date_of_birth || !specialization || !license_number){
    return res.status(400).json({error:"couldnot find required fields in the request"})
  }

  let validGender = ["Male", "Female", "Others"]

  if (!validGender.includes(gender)){
    return res.status(400).json({error:"value of gender is not valid"})
  }

  await doctorProfile.update({
    user_id:req.user.payload.id,
    date_of_birth,
    gender,
    profile_picture,
    specialization,
    organisation_id,
    license_number
  }, {where:{user_id:req.user.payload.id}})

  return res.status(200).jaon({message:"succesfully updated the doctor profile"})
}


const createDoctorProfile = async (req, res)=>{
  const {date_of_birth, gender, profile_picture="https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png", specialization, organisation_id=0, license_number } = req.body

  if (!date_of_birth || !specialization || !license_number){
    return res.status(400).json({error:"couldnot find required fields in the request"})
  }

  let validGender = ["Male", "Female", "Others"]

  if (!validGender.includes(gender)){
    return res.status(400).json({error:"value of gender is not valid"})
  }

  await doctorProfile.create({
    user_id:req.user.payload.id,
    date_of_birth,
    gender,
    profile_picture,
    specialization,
    organisation_id,
    license_number
  })

  return res.status(200).json({message:"succesfully created the doctor profile"})
}

module.exports = { completeDoctorProfile };
