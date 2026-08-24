const { literal } = require("sequelize")
const {User, organisationProfile} = require("../../../models")

const filterHospitalsByLocation = async (req, res)=>{
    const userLatitude = parseFloat(req.query.userLatitude) || null
    const userLongitude = parseFloat(req.query.userLongitude) || null

    if (!userLatitude || !userLongitude){
        return res.status(400).json({error:"cant find the user location"})
    }

    const filterInMeters = parseInt(req.query.filterInMeters) || 5000

    const hospitals = await User.findAll({
        attributes: {
            include: [
                [
                    literal(`
                        ST_DistanceSphere(
                            ST_MakePoint(longitude, latitude),
                            ST_MakePoint(${userLongitude}, ${userLatitude})
                        )
                    `),
                    "distance"
                ]
            ]
        },
        include: [
            {
                model: organisationProfile,
                as: "organisationProfile",
                attributes: ["gender", "practice_start_date", "consultation_fee", "specialization", "profile_picture", "appointment_time"],
                where: {
                    verified_status: "approved"
                }
            }
        ],
        where: {
            role: "doctor",
            [literal(`
                ST_DWithin(
                    ST_MakePoint(longitude, latitude)::geography,
                    ST_MakePoint(${userLongitude}, ${userLatitude})::geography,
                    ${filterInMeters}
                )
            `)]: true
        },
        order: literal(`
            ST_DistanceSphere(
                ST_MakePoint(longitude, latitude),
                ST_MakePoint(${userLongitude}, ${userLatitude})
            )
        `),
    });
    

    print(hospitals)

    return res.status(400).json({message:"successfull"})
}

module.exports = filterHospitalsByLocation