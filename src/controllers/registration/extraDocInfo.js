const { doctorProfile, doctorSlots } = require("../../../models");
const generateWeeklySlots = require("../slots/createSlots");


const updateExtraDocInfo = async(req, res)=>{
    const {id} = req.user.payload
    const {availability_schedule, consultation_fee, experience_years, appointment_slot} = req.body

    if (!availability_schedule || !consultation_fee || !experience_years || !appointment_slot){
        return res.status(400).json({error:"all the required fields are not satisfied in the request"})
    }
    
    if (availability_schedule.length !== 7){
      return res.status(400).json({error:"availability schedule is not in valid format"})
    }

    const consultationSaved = await addConsultationFee(req, res, consultation_fee)
    const experienceSaved = await addExperience(req, res, experience_years)
    const availabilitySaved = await addAvailabilitySchedule(req, res, availability_schedule)

    const slotSaved = await createSlot(req, res, availability_schedule, appointment_slot)

    if (consultationSaved && experienceSaved && availabilitySaved && slotSaved){
        return res.status(200).json({message:"succesfully completed adding the extra info of doctors"})
    }
}

const createSlot = async(req, res, availability_schedule, appointment_slot)=>{
    const slots = await generateWeeklySlots(availability_schedule, appointment_slot);

    // Convert the slots array into an object for DB
    const slotData = {
        slot_monday: slots[0],
        slot_tuesday: slots[1],
        slot_wednesday: slots[2],
        slot_thursday: slots[3],
        slot_friday: slots[4],
        slot_saturday: slots[5],
        slot_sunday: slots[6],
        doctor_id: req.user.payload.id, // make sure this is defined
    };

    await doctorSlots.create(slotData);

    return true
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

module.exports = {updateExtraDocInfo}