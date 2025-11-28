const {notificationTokens} = require("../../../models")


const deleteUserToken = async (req, res)=>{
    const {id} = req.user.payload
    const {token} = req.body

    if (!id || !token){
        return res.status(400).json({error:"all fields are required"})
    }

    await notificationTokens.destroy({
        where:{
            user_id: id,
            token
        }
    })

    return res.status(200).json({message: "notification unsubscribed successfully"})
}


module.exports = deleteUserToken