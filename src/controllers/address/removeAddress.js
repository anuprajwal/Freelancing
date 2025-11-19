const { address} = require("../../../models")
// const logger = require('../../../logger')


const removeAddress = async(req,res)=>{
    const {payload} = req.user
    const {id} = payload

    // logger.info(`request to remove address by the user: ${id}`)
    const{addressId} = req.body
    if (!addressId){
        // logger.warning(`te request made by the user:${id} doesnot contain addressId`)
        return res.status(400).json({error:"addressId is required"})
    }
    const getAddress = await address.findOne({where:{id:addressId, user_id:userId}})
    if (!getAddress){
        // logger.warning(`address requested to delete by the user:${id} is not found in the db`)
        return res.status(404).json({error:"address not found for the user"})
    }
    await address.destroy({where:{id:addressId}})
    // logger.info(`the request to remove address by user: ${id}, is complete succesfully`)
    return res.status(200).json({message:"successfully deleted the address"})
}

module.exports = removeAddress