const { doctorSlots } = require("../../../models");

const showSlots = async (req, res)=>{
    const {id} = req.user.payload
    const allSlots = await doctorSlots.findAll({where:{doctor_id : id}})

    if (!allSlots){
        return res.status(404).json({error:"Cant find the slots for the doctor. check filling out the extra doctor information"})
    }

    console.log(allSlots)

    return res.status(200).json({message:"Succesfully fetched all the slots for the doctor", slots:allSlots})
}

module.exports = showSlots