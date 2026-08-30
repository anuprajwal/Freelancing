const {User} = require("../../../models")
const bcrypt = require("bcrypt");


const changeForgottenPassword = async (req, res)=>{
    const {id} = req.params
    let {password_hash} = req.params
    const {newPassword} = req.body

    if (password_hash) {
        password_hash = decodeURIComponent(password_hash);
    }

    const userData = await User.findOne({
        where:{
            id,
            password_hash
        }
    })

    if (!userData){
        return res.status(404).json({error:"cant find the user"})
    }

    if (!newPassword){
        return res.status(400).json({error: "newPassword cant be null"})
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    userData.password_hash = hashedPassword;
    await userData.save();

    return res.status(200).json({message:"password changed succesfully"})
}


module.exports = changeForgottenPassword