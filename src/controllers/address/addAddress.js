const { address } = require("../../../models");
const logger = require('../../../logger')

//api to add a new address
const addAddress = async(req, res)=>{
    
    const {payload} = req.user
    const {id} = payload

    logger.info(`Route to add address to user is called by: ${id}`)
    
    const {country = "India", state = "", city = "", pincode = "", street = "", landmark="", houseNo = "", deliveryName = "", deliveryPNo = ""} = req.body
    if (!city || !pincode || !street || !deliveryName || !deliveryPNo){
        logger.warning(`All fields are required to complete the request`)
        return res.status(400).json({error:"All fields are required"})
    }
    if (deliveryPNo.length !== 10){
        logger.warning(`invalid phone number is entered by the user: ${id}`)
        return res.status(400).json({error:"Phone number must be only 10 numbers"})
    }
    if (pincode.length!== 6){
        logger.warning(`invalid pincode is entered by the user ${id}`)
        return res.status(400).json({error:"pincode can only be 6 numbers"})
    }
    await address.create({user_id : userId, country : country, state: state, city: city, pincode : pincode, street: street, landmark: landmark, house_no: houseNo, delivery_name: deliveryName, delivery_pno: deliveryPNo})
    logger.info(`the request to add address by user: ${id}, is complete succesfully`)
    return res.status(200).json({message:"address added succesfully"})
}

module.exports = addAddress