const {organisationRequest} = require("../../../models")

const checkDoctorRequests = async (req, res)=>{
    const {id} = req.user.payload

    if (!id){
        return res.status(400).json({error:"the user doesnot seem to be authorised as organisation admin"})
    }


    const req_details = await organisationRequest.findOne(
        {
            where:{
                doctor_id:id
            }
        }
    )

    if (!req_details){
        return res.status(404).json({error:"Doctor has not requested any organisation yet"})
    }else if (req_details.request_status === "pending"){
        const {organisation_name} = await organisationProfile.findById(req_details.org_id)
        return res.status(200).json({message:"Doctor has requested an organisation and is waiting for the response", request_status:req_details.request_status, requested_organisation:organisation_name, request_id:req_details.id})
    }else if (req_details.request_status === "accepted"){
        const {organisation_name} = await organisationProfile.findById(req_details.org_id)
        return res.status(200).json({message:"Doctor has requested an organisation and the request has been accepted", request_status:req_details.request_status, requested_organisation:organisation_name, request_id:req_details.id})
    }else if (req_details.request_status === "rejected"){
        const {organisation_name} = await organisationProfile.findById(req_details.org_id)
        return res.status(200).json({message:"Doctor has requested an organisation and the request has been rejected", request_status:req_details.request_status, requested_organisation:organisation_name, request_id:req_details.id})
    }


    

    return res.status(400).json({message:`unexpected case`})
}


module.exports = checkDoctorRequests