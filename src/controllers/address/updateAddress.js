const{ address}= require("../../../models");
const logger = require('../../../logger')


const updateAddress =async(req, res)=>{
    const {payload}=req.user
    const {id} = payload

    logger.info(`request made to update existing address by user: ${id}`)
    const {addressId}=req.body

    if (!addressId){
        logger.warning(`request to update address by user: ${id} doesnot contain addressId`)
        return res.status(400).json({error:"addressId field is not found in the request"})
    }

    const getAddress=await address.findOne({id:addressId, user_id:userId})
    if(!getAddress){
        logger.warning(`Te address to be updated of user: ${id}, is not found in the database`)
        return res.status(404).json({error:"requested address not found"})
    }

    const {country = getAddress.country, state=getAddress.state, city=getAddress.city, pincode=getAddress.pincode, street=getAddress.street,landmark=getAddress.landmark,houseNo=getAddress.houseNo} = req.body

    if (!city || !pincode || !street){
        logger.warning(`fields are not complete in the request made by the user : ${id}`)
        return res.status(400).json({error:"All fields are required"})
    }
    if (pincode.length!== 6){
        logger.warning(`invalid pincode is entered by the user ${id}`)
        return res.status(400).json({error:"pincode can only be 6 numbers"})
    }

    await address.update(
        { active: false },
        { where: { user_id: id } }
    );

    await getAddress.update({country:country, state:state, city:city, pincode:pincode, street:street, landmark:landmark, house_no:houseNo, active:true})

    logger.info(`the request to update address: ${addressId} by user: ${id}, is complete succesfully`)
    return res.status(200).json({message:"address updated succesfully"})
}

module.exports=updateAddress