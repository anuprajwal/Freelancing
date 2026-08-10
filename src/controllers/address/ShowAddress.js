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
    const addresses = await showAddresses(id)

//    logger.info(`the request to show all address of user: ${id}, is complete succesfully`)
    return res.status(200).json({addresses})
}

const sendAddressesByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({
                message: "user_id is required"
            });
        }

        const addresses = await showAddresses(user_id);

        return res.status(200).json({
            addresses
        });

    } catch (error) {
        logger.error(`Error while fetching addresses for user: ${req.body.user_id}`, error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = { sendAddresses, sendAddressesByUserId }
