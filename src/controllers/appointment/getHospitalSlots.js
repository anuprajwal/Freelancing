const {doctorSlots, doctorProfile} = require("../../../models")

const getHospitalSlots = async (req, res)=>{
    const {hospitalId} = req.params

    if (!hospitalId){
        return res.status(400).json({error:"hospital id is not found in the request"})
    }

    const allDoctorsInHospitals = await doctorProfile.findAll({
        where:{
            organisation_id : hospitalId
        },
        attributes:["user_id"]
    })

    const doctorSlots = await doctorSlots.findAll({
        where:{
            doctor_id:allDoctorsInHospitals.map(doctor=>doctor.user_id)
        }
    })

    console.log(doctorSlots)

    return res.status(200).json({doctorSlots})
}


module.exports = getHospitalSlots