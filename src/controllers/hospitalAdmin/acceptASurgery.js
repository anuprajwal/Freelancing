const {surgeryRequest} = require("../../../models")


const acceptOrRejecctSurgery = async (req, res)=>{
    const {surgeryId, updateStatus} = req.body

    if (!["accepted", "rejected"].includes(updateStatus)){
        return res.status(400).json({error:"updateStatus is not in the correct format"})
    }

    const surgery = await surgeryRequest.findOne({
        where:{
            id:surgeryId,
            status: "pending"
        }
    })

    if (!surgery){
        return res.status(404).json({error:"cant find any pending surgery user wanted"})
    }

    await surgeryRequest.update({
        status : updateStatus,
        where:{
            id: surgeryId
        }
    })

    return res.status(200).json({message:"succesfully updated the surgery"})
}


module.exports = acceptOrRejecctSurgery