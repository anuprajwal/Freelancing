const { generalUser, User } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");


//api to complete the patient profile
const completePatientProfile = async (req, res) => {
  try {

    console.log('recieved the control')

    const { payload } = req.user;
    const { id } = payload;

    let user = await validateUserRole(id, "general_user", res);
    if (!user || user.error){
      return res.status(401).json({error:"user is not authorised to this route"})
    };


    let generalUserExists = await generalUser.findOne({ where: { user_id: id } });

    if (!generalUserExists){
      return res.status(404).json({error:"Couldnot find profile of the user"})
    }else{
      const { date_of_birth=generalUserExists.date_of_birth || null, gender = generalUserExists.gender || null, profile_picture = generalUserExists.profile_picture || "" } = req.body
      await generalUserExists.update(
        { date_of_birth, gender, profile_picture },
        { where: { user_id: id } }
      );
      await user.update({ is_active: true });

      return res.status(200).json({ message: "Patient profile updated successfully." });
    }
  } catch (error) {
    console.error("Patient profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { completePatientProfile };
