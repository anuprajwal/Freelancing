const appointments = require("../../models/appointments")
const doctorProfile = require("../../models/doctorProfile")

// the api file which returns the sorted doctors based on their availability
// doctors are sorted less appointment doctors first

const getSortedDoctors = async (req, res)=>{
    const {id} = req.user.payload
    const {hospital_id, specialization} = req.body
    
    const doctorsInHospitals = await doctorProfile.findAll({where:{organisation_id : hospital_id, specialization : specialization}})

    let doctors = doctorsInHospitals.map(async doctor => {
        return  {
            doctor_id : doctor.id,
            appointments : await appointments.findAll({where:{doctor_id : doctor.id, appointment_status: "confirmed" || "pending"}})
        }
    })

    let sortedDoctors = doctors.sort((a, b) => {
        return a.appointments.length - b.appointments.length
    })

    console.log(sortedDoctors)

    return res.status(200).json({sortedDoctors})
}

module.exports = {getSortedDoctors}