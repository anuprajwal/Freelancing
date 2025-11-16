const { address } = require("../../../models");
// const logger = require('../../../logger')


const showAddresses = async (userId)=>{
    const addresses = await address.findAll({
        where:{user_id : userId}
    })
    return addresses
}

const sendAddresses = async(req, res)=>{
    const {payload} = req.user
    const {id} = payload

    // logger.info(`request to show all addresses of the user made by: ${id}`)
    const addresses = showAddresses(id)

    logger.info(`the request to show all address of user: ${id}, is complete succesfully`)
    return res.status(200).json({addresses})
}

module.exports = sendAddresses