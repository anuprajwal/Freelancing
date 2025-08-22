const { literal } = require("sequelize")
const {User, organisationProfile} = require("../../../models")

const filterHospitalsByLocation = async (req, res)=>{
    const userLatitude = parseFloat(req.query.userLatitude) || null
    const userLonitude = parseFloat(req.query.userLonitude) || null

    if (!userLatitude || !userLonitude){
        return res.status(200).json({error:"cant find the user location"})
    }

    const filterInMeters = parseInt(req.query.filterInMeters) || 5000

    const hospitals = await User.findAll({
        attributes: {
            include: [
                [
                    literal(`ST_DistanceSphere(geom, ST_MakePoint(${userLonitude}, ${userLatitude}))`), "distance"
                ]
            ]
        },
        include: [
            {
                model: organisationProfile,
                as: "organisationProfile",
                attributes: ["organisation_type", "organisation_name", "establishment_year", "specializations_provided", "ambulance_available", "website_url", "profile_picture"],
                where:{
                    verified_status: "approved"
                }
            }
        ],
        where: {
            role: "hospital_organisation",
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

    print(hospitals)

    return res.status(400).json({message:"successfull"})
}

module.exports = filterHospitalsByLocation