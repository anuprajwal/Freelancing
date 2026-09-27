const {organisationRequest, organisationProfile} = require("../../../models")


const requestAdmissionRequest = async (req, res)=>{
    const {id} = req.user.payload

    if (!id){
        return res.status(400).json({error:"the user doesnot seem to be logged in"})
    }
    
    const {organisation_id} = req.body

    if (!organisation_id){
        return res.status(400).json({error:"the organisation id is required in the body"})
    }

    const existingRequests = await organisationRequest.findOne({
        where:{
            doctor_id : id,
            org_id : organisation_id
        }
    })

    if (existingRequests){
        return res.status(400).json({error:"You have already requested other organisation. Please wait for the response from the organisation before requesting another one, or you can cancel the existing request and make a new one"})
    }

    if (!organisation_id){
        return res.status(400).json({error:"cant find the required parameters in the body"})
    }

    await organisationProfile.findOne({
        where:{
            id : organisation_id
        }
    }).then(async (organisation)=>{
        if (!organisation){
            return res.status(400).json({error:"the organisation you are trying to request doesnot exist"})
        }
    })

    await organisationRequest.create({
        doctor_id : id,
        org_id : organisation_id
    })

    return res.status(200).json({message:"succesfully requested the organisation"})
}


module.exports = requestAdmissionRequest