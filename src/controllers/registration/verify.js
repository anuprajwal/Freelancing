const { doctorProfile, organisationProfile } = require("../../../models");


const approveDoctors = async (req, res)=>{
    const {id} = req.user.payload
    await doctorProfile.update(
        { verified_status:true },
        { where:{ user_id:id } }
    )
    return res.status(200).json({message:"doctor verified succesfully"})
}

const approveHospitals = async (req, res)=>{
    const {id} = req.user.payload
    await organisationProfile.update(
        { verified_status:true },
        { where:{ user_id:id } }
    )
    return res.status(200).json({message:"hospital verified succesfully"})
}

module.exports = {approveDoctors, approveHospitals}