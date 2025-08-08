const {organisationRequest} = require("../../../models")


const requestAdmissionRequest = async (req, res)=>{
    const {id} = req.user.payload

    if (!id){
        return res.status(400).json({error:"the user doesnot seem to be logged in"})
    }

    const {organisation_id} = req.body

    if (!organisation_id){
        return res.status(400).json({error:"cant find the required parameters in the body"})
    }

    await organisationRequest.create({
        doctor_id : id,
        org_id : organisation_id
    })

    return res.status(200).json({message:"succesfully fetched all the requests of doctors", requestedDocs})
}


module.exports = requestAdmissionRequest