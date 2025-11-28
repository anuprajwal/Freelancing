const {notificationTokens} = require("../../../models")
  

const saveUserToken = async (req, res)=>{
    const { token, platform } = req.body;
    const {id} = req.user.payload

    if (!token || !id || !platform){
        return res.status(400).json({error:"all the fields are required"})
    }
  
    await notificationTokens.create({
        user_id : id, token, platform
    })
    return res.status(200).json({ status: 'successfully added the token' });
}

module.exports = saveUserToken