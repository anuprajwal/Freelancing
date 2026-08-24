const { doctorProfile, doctorSlots } = require("../../../models");
const createOrMergeDoctorSlots = require("../slots/createSlots");


const updateExtraDocInfo = async(req, res)=>{
    const {id} = req.user.payload

    const requestUser = await doctorProfile.findOne({where:{user_id:id}})

    if (!requestUser){
        return res.status(404).json({error:"couldnot find doctor profile on this account"})
    }

    const {availability_schedule, consultation_fee,  appointment_slot} = req.body

    if (!availability_schedule || !consultation_fee || !appointment_slot){
        return res.status(400).json({error:"all the required fields are not satisfied in the request"})
    }
    
    if (availability_schedule.length !== 7){
      return res.status(400).json({error:"availability schedule is not in valid format"})
    }

    const consultationSaved = await addConsultationFee(req, res, consultation_fee)
    const availabilitySaved = await addAvailabilitySchedule(req, res, availability_schedule)

    const slotSaved = await createSlot(req, res, availability_schedule, appointment_slot)

    if (!slotSaved){
        return res.status(400).json({error:"appointment mode is not acceptable, slots not created"})
    }

    if (consultationSaved && availabilitySaved && slotSaved){
        return res.status(200).json({message:"succesfully completed adding the extra info of doctors"})
    }
}

const createSlot = async(req, res, availability_schedule, appointment_slot)=>{
    const slots = await createOrMergeDoctorSlots(req.user.payload.id,availability_schedule, appointment_slot);
    if (slots.error){
        return false
    }else if (slots){
        return true
    }
    
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
        breaks : i.breaks || null,
        appointment_mode : i.mode || null
      }
    }

    await doctorProfile.update({availability_schedule}, {where:{user_id:req.user.payload.id}})

    return true
}

module.exports = updateExtraDocInfo