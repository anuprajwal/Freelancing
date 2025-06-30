const { logger } = require("../../../logger");
const { organisationProfile, User } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");

// api to regester the whole hospital

const registerOrganisation = async (req, res)=>{
    const {payload} = req.user
    const {id} = payload
    logger.info(`request to regester organisation is recieved by user: ${id}`)

    const userObj = await User.findByPk(id)
    
    if (userObj.role !== 'hospital_organisation'){
        return res.status(404).json({error: "the user who is making the request is not regestered as hospital_organisation"})
    }

    const org_obj = await organisationProfile.findOne({where:{user_id:id}})

    if (!org_obj){
        createOrgProfile(req, res)
    }else{
        updateOrgProfile(req, res)
    }    
}


const createOrgProfile = async (req, res)=>{
    const {org_type, org_name, org_license} = req.body

    const valid_type = ['hospital','clinic','pharmacy','laboratory']

    if (!org_type || !org_name || !org_license){
       logger.warning(`required fields for regestering the organisation from user: ${id} are not complete`)
       return req.status(400).json({error:"all fields are required"})
    }

    if (!valid_type.includes(org_type)){
        logger.warning(`organisation type: ${org_type} is not valid`)
        return req.status(400).json({error:"organisation type is not valid"})
    }

    await organisationProfile.create({
        user_id : req.user.payload.id,
        profile_picture : "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270847/hospital-building_4821512_qr0gvo.png",
        organisation_name:org_name,
        organisation_type:org_type,
        regestration_number: org_license
    })

    return res.status(200).json({message:"organisation profile is created succesfully"})
}


const updateOrgProfile = async (req, res)=>{
    const org_obj = await organisationProfile.findOne({where:{user_id:req.user.payload.id}})

    const valid_type = ['hospital','clinic','pharmacy','laboratory']

    if (!valid_type.includes(org_type)){
        logger.warning(`organisation type: ${org_type} is not valid`)
        return req.status(400).json({error:"organisation type is not valid"})
    }

    const {
        org_name = org_obj.organisation_name,
        org_type = org_obj.organisation_type,
        org_license = org_obj.regestration_number,
        org_establishment = org_obj.establishment_year,
        org_url = org_obj.website_url,
        org_profile = org_obj.profile_picture,
        org_ambulance = org_obj.ambulance_available,
        org_services = org_obj.specializations_provided
    } = req.body

    await organisationProfile.update({
        user_id:req.user.payload.id,
        organisation_name:org_name,
        organisation_type:org_type,
        regestration_number:org_license,
        establishment_year:org_establishment,
        website_url:org_url,
        profile_picture:org_profile,
        ambulance_available:org_ambulance,
        specializations_provided:org_services
    }, {where:{user_id:req.user.payload.id}})

    return res.status(200).json({message:"organisation profile is updated succesfully"})
}