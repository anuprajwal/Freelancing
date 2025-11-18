const {User} = require("../../../models")
const bcrypt = require("bcrypt");

const changePassword = async (req, res)=>{
    const {id} = req.user.payload
    const {newPassword} = req.body

    const userData = await User.findByPk(id)

    if (!userData){
        return res.status(404).json({error:"cant find the user"})
    }

    if (!newPassword){
        return res.status(400).json({error: "newPassword cant be null"})
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.update({
        password_hash: hashedPassword,
        where:{
            id
        }
    })

    return res.status(200).json({message:"password changed succesfully"})
}


module.exports = changePassword
