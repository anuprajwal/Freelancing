const {organisationProfile, doctorProfile} = require("../../../models")


const removeHospitalStaff = async (req, res)=>{
    const {org_id} = req.user.payload

    const {doctor_id} = req.body

    if(!doctor_id){
        return res.status(400).json({error:"cant find doctor_id in the request"})
    }

    const doctorDetails = await doctorProfile.findOne({
        where:{
            user_id:doctor_id
        }
    })

    if (!doctorDetails){
        return res.status(404).json({error:"cant find any doctor over this id"})
    }

    await doctorProfile.update({
        organisation_id: null,
        where:{
            user_id: doctor_id
        }
    })

    return res.status(200).json({message:"succesfully removed staff from the organisation"})
}


module.exports = removeHospitalStaff