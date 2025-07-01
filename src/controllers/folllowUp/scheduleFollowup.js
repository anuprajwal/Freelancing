const {appointments} = require('../../../models')

const scheduleFollowup = async (req, res) => {
    const {appointment_id, followup_date, followup_time, followup_type} = req.body
    const {id} = req.user.payload

    const appointment = await appointments.findOne({where: {id: appointment_id, user_id: id}})
    if (!appointment) {
        return res.status(404).json({message: "Appointment not found"})
    }

    const followup = await followups.create({appointment_id: appointment_id, user_id: id})

    return res.status(200).json({message: "Followup scheduled successfully", followup})
}
