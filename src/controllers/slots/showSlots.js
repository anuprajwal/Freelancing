const { doctorSlots } = require("../../../models");

const showSlots = async (req, res)=>{
    const {doctor_id} = req.params

    if (!doctor_id){
        return res.status(404).json({error:"cant find the doctor_id in the request body"})
    }

    const allSlots = await doctorSlots.findAll({where:{doctor_id}})

    console.log(allSlots)

    if (!allSlots){
        return res.status(404).json({error:"Cant find the slots for the doctor. Check filling out the extra doctor information"})
    }


    return res.status(200).json({message:"Succesfully fetched all the slots for the doctor", slots:allSlots})
}

module.exports = showSlots