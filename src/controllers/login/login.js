const {User} = require("../../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// the api to login any user 

const loginUser = async (req, res) => {
    const {email, password, role="general_user"} = req.body;
    const user_ip = req.ip;
    try {
        const user = await User.findOne({where: {email, role}});
        if (!user) {
            return res.status(403).json({error: "User not found"});
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(403).json({error: "Invalid credentials"});
        }

        const token = generateToken(user, user_ip);
        res.cookie("token", token.token, {
            httpOnly: true,  
            secure: true,   
            sameSite: "None",
            maxAge: parseInt(token.expiresIn,10), 
        });
        return res.status(200).json({message:"Login Success"});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "Login failed"});
    }
}


const generateToken = (user, user_ip) => {
    const token = jwt.sign({id: user.id, email: user.email, ip: user_ip}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
    console.log("token generated for user", user.email, "id", token);
    console.log("token expires in:", process.env.JWT_EXPIRES_IN)
    return {token, expiresIn: process.env.JWT_EXPIRES_IN};
}

module.exports = {loginUser, generateToken};
