const { doctorProfile } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");


// api to complete doctor profile
const completeDoctorProfile = async (req, res) => {
  try {
    const { payload } = req.user; 
    const { id } = payload;

    
    const user = await validateUserRole(id, "doctor");
    if (!user){
      return res.status(401).json({error:"user is not authorised to this route"})
    }
    else if(user.error){
      return res.status(401).json({error:user.error})
    }


    const doctorObj = await doctorProfile.findOne({where:{user_id:id}})
    await user.update({ is_active: true });
    if (!doctorObj){
      return createDoctorProfile(req, res)
    }else{
      return updateDoctorProfile(req, res, doctorObj)
    }
  } catch (error) {
    console.error("Doctor profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


const updateDoctorProfile = async (req, res, doctorObj)=>{
  const {
    date_of_birth,
    gender,
    profile_picture,
    specialization,
    license_number,
    experience_years
  } = req.body;

  
  if (!date_of_birth || !specialization || !license_number){
    return res.status(400).json({error:"couldnot find required fields in the request"})
  }

  let validGender = ["Male", "Female", "Others"]

  if (!validGender.includes(gender)){
    return res.status(400).json({error:"value of gender is not valid"}) 
  }
  const updatedDoctor = {
    date_of_birth: date_of_birth ?? doctorObj.date_of_birth,
    gender: gender ?? doctorObj.gender,
    profile_picture: profile_picture ?? doctorObj.profile_picture,
    specialization: specialization ?? doctorObj.specialization,
    license_number: license_number ?? doctorObj.license_number,
    experience_years: experience_years ?? doctorObj.experience_years
  };

  await doctorProfile.update({
    date_of_birth : updatedDoctor.date_of_birth,
    gender : updatedDoctor.gender,
    profile_picture : updatedDoctor.profile_picture,
    specialization : updatedDoctor.specialization,
    license_number : updatedDoctor.license_number,
    experience_years : updatedDoctor.experience_years
  }, {where:{user_id:req.user.payload.id}})
  return res.status(200).json({ message: "Profile updated successfully" });
}


const createDoctorProfile = async (req, res)=>{
  const {date_of_birth, experience_years, gender, profile_picture="https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png", specialization, license_number } = req.body

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
    license_number,
    experience_years
  })

  return res.status(200).json({ message: "Profile updated successfully" });

}

module.exports = { completeDoctorProfile };
