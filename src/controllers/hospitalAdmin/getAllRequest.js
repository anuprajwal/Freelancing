const {organisationRequest, doctorProfile, User} = require("../../../models")


const getAllRequests = async (req, res)=>{
    const {org_id} = req.user.payload

    if (!org_id){
        return res.status(400).json({error:"the user doesnot seem to be authorised as organisation admin"})
    }

    const requestedDocs = await organisationRequest.findAll({
        where:{
            org_id,
            request_status : "pending"
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['email', 'username'],
                include: [
                  {
                    model: doctorProfile,
                    as: 'doctorProfile',
                    required: true,
                    attributes: ['date_of_birth', 'gender', 'specialization', "practice_start_date", "license_number", "verified_status"], 
                  }
                ]
              }
        ]
    })

    return res.status(200).json({message:"succesfully fetched all the requests of doctors", requestedDocs})
}


module.exports = getAllRequests