const {organisationRequest, doctorProfile} = require("../../../models")

const acceptDocRequests = async (req, res)=>{
    const {org_id} = req.user.payload

    if (!org_id){
        return res.status(400).json({error:"the user doesnot seem to be authorised as organisation admin"})
    }

    const {request_id, request_status} = req.body

    if (!request_id || !request_status){
        return res.status(400).json({error:"cant find the required parameters in the body"})
    }

    if (!["rejected", "accepted"].includes(request_status)){
        return res.status(400).json({error:"request status is malformed"})
    }

    const req_details = await organisationRequest.findByPk(request_id)

    if (!req_details){
        return res.status(404).json({error:"cant find the request"})
    }

    await organisationRequest.update(
        {request_status},
        {
            where:{
                id:request_id
            }
        }
    )

    await doctorProfile.update(
        {organisation_id:req_details.org_id},
        {
            where:{
                user_id:req_details.doctor_id
            }
        }
    )

    return res.status(200).json({message:`sucessfully ${request_status}`})
}


module.exports = acceptDocRequests