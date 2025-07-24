const {notificationTokens} = require("../../../models")
  

const saveUserToken = async (req, res)=>{
    const { token, userId, platform } = req.body;

    if (!token || !userId || !platform){
        return res.status(400).json({error:"all the fields are required"})
    }
  
    await notificationTokens.create({
        user_id : userId, token, platform
    })
    return res.status(200).json({ status: 'successfully added the token' });
}

module.exports = saveUserToken