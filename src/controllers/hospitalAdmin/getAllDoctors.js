const {doctorProfile, User} = require("../../../models")


const getAllDoctors = async (req, res)=>{
    const {org_id} = req.user.payload

    if (!org_id){
        return res.status(404).json({error:"account found, but couldnot find the organisation profile over the account."})
    }
    const allDoctorsInOrganisation = await doctorProfile.findAll({
        where: { organisation_id: org_id },
        include: [
            {
            model: User,
            as: "user",        // use the alias defined in your associations
            attributes: ["id", "username", "email", "phone_number", "role", "account_status", "is_email_verified", "is_phone_verified"]  // choose what you want to return
            }
        ]
    });


    if (allDoctorsInOrganisation.length === 0){
        return res.status(404).json({error:"can't find any doctor in your organisation"})
    }

    return res.status(200).json({message:"succesfully found and fetched all the doctors from the organisation", allDoctorsInOrganisation})
}

module.exports = getAllDoctors