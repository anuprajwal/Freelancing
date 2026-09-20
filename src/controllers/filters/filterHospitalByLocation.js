// const { literal } = require("sequelize")
// const {User, organisationProfile} = require("../../../models")

// const filterHospitalsByLocation = async (req, res)=>{
//     const userLatitude = parseFloat(req.query.userLatitude) || null
//     const userLongitude = parseFloat(req.query.userLongitude) || null

//     if (!userLatitude || !userLongitude){
//         return res.status(400).json({error:"cant find the user location"})
//     }

//     const filterInMeters = parseInt(req.query.filterInMeters) || 5000

//     const hospitals = await User.findAll({
//         attributes: {
//             include: [
//                 [
//                     literal(`
//                         ST_DistanceSphere(
//                             ST_MakePoint(longitude, latitude),
//                             ST_MakePoint(${userLongitude}, ${userLatitude})
//                         )
//                     `),
//                     "distance"
//                 ]
//             ]
//         },
//         include: [
//             {
//                 model: organisationProfile,
//                 as: "organisationProfile",
//                 attributes: ["gender", "practice_start_date", "consultation_fee", "specialization", "profile_picture", "appointment_time"],
//                 where: {
//                     verified_status: "approved"
//                 }
//             }
//         ],
//         where: {
//             role: "doctor",
//             [literal(`
//                 ST_DWithin(
//                     ST_MakePoint(longitude, latitude)::geography,
//                     ST_MakePoint(${userLongitude}, ${userLatitude})::geography,
//                     ${filterInMeters}
//                 )
//             `)]: true
//         },
//         order: literal(`
//             ST_DistanceSphere(
//                 ST_MakePoint(longitude, latitude),
//                 ST_MakePoint(${userLongitude}, ${userLatitude})
//             )
//         `),
//     });
    

//     print(hospitals)

//     return res.status(400).json({message:"successfull"})
// }

// module.exports = filterHospitalsByLocation

const { literal, Op } = require("sequelize");
const { User, organisationProfile } = require("../../../models");

const filterHospitalsByLocation = async (req, res) => {
    try {
        const userLatitude = parseFloat(req.query.userLatitude) || null;
        const userLongitude = parseFloat(req.query.userLongitude) || null;

        if (!userLatitude || !userLongitude) {
            return res.status(400).json({ error: "Cannot find the user location" });
        }

        const filterInMeters = parseInt(req.query.filterInMeters) || 5000;

        // MySQL 8.0 compatible spatial expression for distance in meters
        const distanceFormula = `
            ST_Distance_Sphere(
                Point(longitude, latitude),
                Point(${userLongitude}, ${userLatitude})
            )
        `;

        const hospitals = await User.findAll({
            attributes: {
                include: [
                    [literal(distanceFormula), "distance"]
                ]
            },
            include: [
                {
                    model: organisationProfile,
                    as: "organisationProfile",
                    attributes: [
                        "id",
                        "gender", 
                        "practice_start_date", 
                        "consultation_fee", 
                        "specialization", 
                        "profile_picture", 
                        "appointment_time"
                    ],
                    where: {
                        verified_status: "approved"
                    }
                }
            ],
            where: {
                role: "doctor",
                // Use literal inside Op.and to safely pass custom SQL conditions in MySQL
                [Op.and]: [
                    literal(`${distanceFormula} <= ${filterInMeters}`)
                ]
            },
            order: literal(distanceFormula)
        });

        console.log(hospitals);

        return res.status(200).json({ 
            message: "Successful", 
            data: hospitals 
        });

    } catch (error) {
        console.error("Error filtering hospitals:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = filterHospitalsByLocation;