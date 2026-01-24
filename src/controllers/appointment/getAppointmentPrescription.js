const {
    appointments,
    User,
    doctorProfile
} = require('../../../models')


const getPrescription = async (req, res) => {
    const appointmentId = parseInt(req.query.appointmentId) || null

    if (!appointmentId) {
        return res.status(400).json({
            error: "can't find the appointment id in the request"
        })
    }

    const apppointmentDetails = await appointments.findByPk(appointmentId, {
        include: [{
            model: User,
            as: "doctor",
            required: true,
            include: [{
                model: doctorProfile,
                as: "doctorProfile",
                required: true
            }]
        }]
    })

    if (!apppointmentDetails) {
        return res.status(404).json({
            error: "can't find the appointment on the provided id"
        })
    }

    return res.status(200).json({
        message: "successfully fetched the prescription"
    })
}

module.exports = getPrescription