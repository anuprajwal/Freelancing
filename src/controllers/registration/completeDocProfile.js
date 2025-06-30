const { doctorProfile } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");


// api to complete doctor profile
const completeDoctorProfile = async (req, res) => {
  try {
    const { payload } = req.user; // Extracted from authentication middleware
    const { id } = payload;
    const user = await validateUserRole(id, "doctor", res);
    if (!user){
      return res.status(401).json({error:"user is not authorised to this route"})
    }
    else if(user.error){
      return res.status(401).json({error:user.error})
    }
    const { gender , date_of_birth , profile_picture , specialization  , experience_years , license_number , hospital_affiliation , consultation_fee , availability_schedule  } = req.body;

    if ( !gender || !date_of_birth || !specialization || !experience_years || !license_number || !consultation_fee || !availability_schedule) {
      return res.status(400).json({ error: "All fields are required." });
    }

    let availabilityTimeTable = {}

    for (let i of availability_schedule){
      availabilityTimeTable[i.day] = {
        start : i.loginTime || null,
        end : i.logoutTime || null,
        breaks : i.breaks || null
      }
    }

    if (availability_schedule.length !== 7){
      console.log('availability length:', availability_schedule.length)
      return res.status(400).json({error:"availability schedule is not in valid format"})
    }



    console.log("availability check:", availabilityTimeTable)

    // Create or update doctor profilec
    let doctorExists  = await doctorProfile.findOne({where : {user_id : id}})
    if(!doctorExists){
        doctorExists = await doctorProfile.create({
            gender,
            date_of_birth ,
            profile_picture ,
            specialization  ,
            experience_years ,
            license_number ,
            hospital_affiliation ,
            consultation_fee ,
            availability_schedule : availabilityTimeTable,
            user_id : id
        })
    }
    else{
        try {
            await doctorExists.update({
              gender , 
              date_of_birth , 
              profile_picture , 
              specialization  , 
              experience_years , 
              license_number , 
              hospital_affiliation , 
              consultation_fee , 
              availability_schedule : availabilityTimeTable},
              {
                where : {user_id : id}
              }
            )  
        } catch (error) {
          console.log("Profile updatation error : " , error); 
            return res.status(500).json({message: "Doctor profile not updated"})
            
        }
        
    }
    

    // Mark doctor profile as completed
    await user.update({ is_active: true });

    res.status(200).json({ message: "Profile updated successfully", doctorExists });
  } catch (error) {
    console.error("Doctor profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { completeDoctorProfile };
