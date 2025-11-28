const {surgeryRequest} = require("../../../models")

const deleteSurgery = async (req, res)=>{
    const {id} = req.user.payload
    const {surgeryId} = req.params

    const surgery = await surgeryRequest.findOne({
        where:{
            id:surgeryId,
            user_id: id,
            status: "pending"
        }
    })

    if (!surgery){
        return res.status(404).json({error:"cant find any pending surgery user wanted"})
    }

    await surgeryRequest.destroy({where:{id:surgeryId}})

    return res.status(200).json({messsage:"succesfully deleted the surgery request"})
}

module.exports = deleteSurgery