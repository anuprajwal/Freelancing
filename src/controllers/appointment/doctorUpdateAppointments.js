const {appointments, doctorProfiles} = require('../../../models')


const appointmentUpdateByDoctor = async (req, res)=>{
    const {id} = req.user.payload

    const {appointment_id, appointment_status, prescription=null} = req.body

    const doctorUser = await doctorProfiles.findOne({where:{user_id : id}})

    if (!doctorUser){
        return res.status(400).json({error:"user trying to update appointment is not recognised as the authorised doctor"})
    }

    const appointment_data = await appointments.findOne({where:{id:appointment_id, doctor_id: id}})

    if(appointment_data){
        return res.status(400).json({error:"couldnot find the appointment which user is trying to update"})
    }

    if (appointment_status !== "closed"){
        return req.status(400).json({error:'Appointment Status is not accepted'})
    }

    await appointments.update({appointment_status, prescription}, {where:{id:appointment_id, doctor_id:id}})
}

module.exports = appointmentUpdateByDoctor