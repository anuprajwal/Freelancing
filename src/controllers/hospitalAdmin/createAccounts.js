const {oranisationProfile, User} = require('../../../models')



const createAccounts = async (req, res)=>{
    const {id, org_id} = req.user.payload
    const {email} = req.body
    const organisationDetails = await oranisationProfile.findOne({where:{user_id:id}})
    let createdAccounts = []
    let refusedAccounts = []
    for (let i of email){
        const userExists = await User.findOne({where:{
            email : i,
            role : "doctor"
        }})

        if (userExists){
            refusedAccounts.push({
                rejectedEmail: i, reason:'account exists'
            })
            continue
        }

        const createdPassword = organisationDetails.organisation_name + '@@' + i

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(createdPassword, salt);

        const user = await User.create({
            username : "doctor at "+ organisationDetails.organisation_name,
            email: i,
            phone_number : '1234567890',
            password_hash: hashedPassword,
            role : "doctor",
            is_active: false, 
        });
        createDoctorProfile(user.id, org_id)
        createdAccounts.push({createdEmail:i})
    }
    return res.status(200).json({message:"profiles are created in the following way", createdAccounts, refusedAccounts})
}


const createDoctorProfile = async(id, org_id)=>{
    await doctorProfile.create({
      user_id : id,
      organisation_id: org_id,
      profile_picture : "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png"
    })
  }

module.exports = createAccounts