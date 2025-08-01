const {User} = require("../../../models")

const forgotPassword = async (req, res)=>{
    const {email, role} = req.body

    const userData = await User.findOne({
        where:{
            email,
            role
        }
    })

    if (!userData){
        return res.status(404).json({error:"no account found on the given details"})
    }

    const {id, password_hash} = userData
    const createdUrl = `/change-forgoten-password/${password_hash}/${id}`

    // axios.post('http://127.0.0.1:5500/api/send-email', { to: email, subject: "cahnge your password", text: createdUrl }, {
    //   headers: {
    //     'Content-Type': 'application/json'
    //   }
    // })
    // .then(response => {
    //   console.log('Response:', response.data);
    // })
    // .catch(error => {
    //   console.error('Error:', error.message);
    // });

    return res.status(200).json({message:"email to reset pasword is sent to the email.", paswordChangeUrl:createdUrl})
}

module.exports = forgotPassword