const {
    doctorProfile,
    organisationProfile,
    User
} = require("../../../models");


const approveDoctors = async (req, res) => {
    const {
        id,
        scope
    } = req.admin
    const {
        doctor_id
    } = req.body

    if (scope !== "admin") {
        return res.status(401).json({
            error: "unauthorised"
        })
    }

    if (!doctor_id) {
        return res.status(404).json({
            error: "doctor_id not found in the body"
        })
    }

    const doesExist = await User.findByPk(doctor_id)
    if (!doesExist || doesExist.role !== "doctor") {
        return res.status(400).json({
            error: "doctor not found"
        })
    }

    await doctorProfile.update({
        verified_status: true
    }, {
        where: {
            user_id: doctor_id
        }
    })

    return res.status(200).json({
        message: "doctor verified succesfully"
    })
}

const approveHospitals = async (req, res) => {
    const {
        id,
        scope
    } = req.admin

    const {
        org_id
    } = req.body

    if (scope !== "admin") {
        return res.status(401).json({
            error: "unauthorised"
        })
    }

    if (!org_id) {
        return res.status(404).json({
            error: "org_id not found in the body"
        })
    }

    const doesExist = await User.findByPk(org_id)
    if (!doesExist || doesExist.role !== "hospital_organisation") {
        return res.status(400).json({
            error: "organisation not found"
        })
    }

    await organisationProfile.update({
        verified_status: true
    }, {
        where: {
            user_id: org_id
        }
    })

    return res.status(200).json({
        message: "hospital verified succesfully"
    })
}

module.exports = {
    approveDoctors,
    approveHospitals
}