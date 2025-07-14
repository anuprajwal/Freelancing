const {User} = require("../../../models");

const getUserDetails = async (req, res)=>{
    try{
        const {id} = req.user.payload
    const userDetails = await User.findByPk(id);

    if (!userDetails) {
        return res.status(404).json({ message: "User not found" });
    }


    res.status(200).json({message:"succesfully fetched the user details", userData:userDetails})
    }catch(e){
        console.error("Error fetching user details:", error);
        return res.status(500).json({error:"Unexpected error in the server"})
    }
    
}

module.exports = getUserDetails