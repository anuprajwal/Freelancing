const {doctorSlots, doctorProfile, organisationProfile} = require("../../../../models")

const getHospitalSlots = async (req, res)=>{
    const {hospitalId} = req.params

    if (!hospitalId){
        return res.status(400).json({error:"hospital id is not found in the request"})
    }

    const hospital_data = await organisationProfile.findOne({
        where:{
            id: hospitalId
        }
    })

    if (!hospital_data){
        return res.status(404).json({error:"cant find the desired hospital"})
    }

    const allDoctorsInHospitals = await doctorProfile.findAll({
        where:{
            organisation_id : hospitalId
        },
        attributes:["user_id"]
    })

    const doctorSlot = await doctorSlots.findAll({
        where:{
            doctor_id:allDoctorsInHospitals.map(doctor=>doctor.user_id)
        }
    })

    console.log(doctorSlot)

    return res.status(200).json({doctorSlot})
}


module.exports = getHospitalSlots