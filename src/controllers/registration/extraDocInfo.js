const { doctorProfile, User } = require("../../../models");


const updateExtraDocInfo = async(req, res)=>{
    const {id} = req.user.payload
    const {availability_schedule, consultation_fee, experience_years} = req.body

    if (!availability_schedule || !consultation_fee || !experience_years){
        return res.status(400).json({error:"all the required fields are not satisfied in the request"})
    }
    
    if (availability_schedule.length !== 7){
      return res.status(400).json({error:"availability schedule is not in valid format"})
    }

    const consultationSaved = await addConsultationFee(req, res, consultation_fee)
    const experienceSaved = await addExperience(req, res, experience_years)
    const availabilitySaved = await addAvailabilitySchedule(req, res, availability_schedule)

    if (consultationSaved && experienceSaved && availabilitySaved){
        return res.status(200).json({message:"succesfully completed addin the extra info of doctors"})
    }
}

const addExperience = async(req, res, experience_years)=>{
    if (typeof experience_years !== 'number'){
        return res.status(400).json({error:"years in not in correct format"})
    }

    await doctorProfile.update({experience_years}, {where:{user_id:req.user.payload.id}})

    return true
}

const addConsultationFee = async (req, res, consultation_fee)=>{
    if (consultation_fee<0){
        return res.status(400).json({error:"the consultation fee cannot be negative"})
    }

    await doctorProfile.update({consultation_fee},{where:{user_id:req.user.payload.id}})

    return true
}


const addAvailabilitySchedule= async (req, res, availability_schedule)=>{
    let availabilityTimeTable = {}

    for (let i of availability_schedule){
      availabilityTimeTable[i.day] = {
        start : i.loginTime || null,
        end : i.logoutTime || null,
        breaks : i.breaks || null
      }
    }

    await doctorProfile.update({availability_schedule}, {where:{user_id:id}})

    return true
}