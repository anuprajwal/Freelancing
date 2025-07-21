const {doctorProfile} = require("../../../models")


const getAllDoctors = async (req, res)=>{
    const {org_id} = req.user.payload

    if (!org_id){
        return res.status(404).json({error:"account found, but couldnot find the organisation profile over the account."})
    }
    const allDoctorsInOrganisation = await doctorProfile.findAll({where:{organisation_id:org_id}})

    if (allDoctorsInOrganisation.length === 0){
        return res.status(404).json({error:"can't find any doctor in your organisation"})
    }

    return res.status(200).json({message:"succesfully found and fetched all the doctors from the organisation", allDoctorsInOrganisation})
}

module.exports = getAllDoctors