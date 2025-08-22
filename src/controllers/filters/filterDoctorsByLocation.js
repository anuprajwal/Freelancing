const { literal } = require("sequelize")
const {User, doctorProfile} = require("../../../models")

const filterDoctorByLocation = async (req, res)=>{
    const userLatitude = parseFloat(req.query.userLatitude) || null
    const userLonitude = parseFloat(req.query.userLonitude) || null

    if (!userLatitude || !userLonitude){
        return res.status(200).json({error:"cant find the user location"})
    }

    const filterInMeters = parseInt(req.query.filterInMeters) || 5000

    const docs = await User.findAll({
        attributes: {
            include: [
                [
                    literal(`ST_DistanceSphere(geom, ST_MakePoint(${userLonitude}, ${userLatitude}))`), "distance"
                ]
            ]
        },
        include: [
            {
                model: doctorProfile,
                as: "doctorProfile",
                attributes: ["gender", "experience_years", "consultation_fee", "specialization", "profile_picture", "appointment_time"],
                where:{
                    verified_status: "approved"
                }
            }
        ],
        where: {
            role: "doctor",
            [literal(`
                ST_DWithin(
                    geom, 
                    ST_MakePoint(${userLonitude}, ${userLatitude})
                ), ${filterInMeters}
            `)]: true
        },
        order: literal(`
                ST_DistanceSphere(geom, ST_MakePoint(${userLonitude}, ${userLatitude}))
        `),
    })

    print(docs)

    return res.status(400).json({message:"successfull"})
}


module.exports = filterDoctorByLocation