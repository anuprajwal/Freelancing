const {organisationProfile} = require('../../models')

const hospitalAdminAuth = async (req, res, next)=>{
    const {id, scope} = req.user.payload

    if (scope !== "hospital_organisation"){
        return res.status(403).json({error:"the user doesnot seem to be regestered as hospital or other organisation"})        
    }

    const profile = await organisationProfile.findOne({where:{user_id:id}})

    if (!profile){
        return res.status(404).json({error:"account found, but couldnot find the organisation profile over the account."})
    }

    req.user.payload.org_id = profile.id

    next()
}

module.exports = hospitalAdminAuth