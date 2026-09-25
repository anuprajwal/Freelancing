const { User, doctorProfile } = require("../../../models");
const axios = require('axios');


const checkDoctorOrg = async (req, res) => {
  const { id } = req.user.payload;
  try{
    const doctorObj = await doctorProfile.findOne({
        where: {
        user_id: id
        }
    });

    if (!doctorObj) {
        return res.status(404).json({ error: "Doctor profile not found" });
    }

    const organisation_id = doctorObj.organisation_id;
    
    return res.status(200).json({belongs_to_org: organisation_id !== null, organisation_id:organisation_id});
  }catch(e){
    return res.status(500).json({ error: `Error in Server :${e}` });
  }
};

module.exports = checkDoctorOrg;
