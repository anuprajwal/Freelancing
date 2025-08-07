const {doctorProfile, organisationProfile} = require('../../../../models')


const createHospitalAppointment = async (req, res)=>{
    const {id} = req.user.payload
    const {hospital_id} = req.body

    if (!hospital_id){
        return res.status(400).json({error:"cant find hospital id in the request"})
    }

    const hospital_data = await organisationProfile.findOne({
        where:{
            id: hospital_id
        }
    })

    if (!hospital_data){
        return res.status(404).json({error:"cant find the desired hospital"})
    }

    const allDoctors = await doctorProfile.findAll({
        where:{
            organisation_id : hospital_id
        },
        attributes : ['user_id']
    })
    const doctorsAvailabilitySlots = allDoctors.map(async eachDoc =>{
        return await doctorSlots.findOne({
            where : {
                doctor_id : eachDoc.user_id
            },
            attributes: ['slots', 'doctor_id']
        })
    })
    return res.status(200).json({message:doctorsAvailabilitySlots})
}


module.exports = createHospitalAppointment