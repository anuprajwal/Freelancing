const { literal, Op } = require("sequelize")
const {User, doctorProfile} = require("../../../models")

const filterDoctorByLocation = async (req, res)=>{
    const userLatitude = parseFloat(req.query.userLatitude) || null
    const userLongitude = parseFloat(req.query.userLongitude) || null

    if (!userLatitude || !userLongitude){
        return res.status(400).json({error:"cant find the user location"})
    }

    const filterInMeters = parseInt(req.query.filterInMeters) || 5000

    const docs = await User.findAll({
        attributes: {
          include: [
            [
              literal(`
                6371000 * ACOS(
                  COS(RADIANS(${userLatitude})) *
                  COS(RADIANS(latitude)) *
                  COS(RADIANS(longitude) - RADIANS(${userLongitude})) +
                  SIN(RADIANS(${userLatitude})) *
                  SIN(RADIANS(latitude))
                )
              `),
              "distance"
            ]
          ]
        },
        include: [
          {
            model: doctorProfile,
            as: "doctorProfile",
            attributes: [
              "gender", "practice_start_date", "consultation_fee",
              "specialization", "profile_picture", "appointment_time"
            ],
            // where: {
            //   verified_status: true,
            // }
          }
        ],
        where: {
          role: "doctor",
          // Filter only those within a certain distance in meters
          [Op.and]: [
            literal(`
              6371000 * ACOS(
                COS(RADIANS(${userLatitude})) *
                COS(RADIANS(latitude)) *
                COS(RADIANS(longitude) - RADIANS(${userLongitude})) +
                SIN(RADIANS(${userLatitude})) *
                SIN(RADIANS(latitude))
              ) <= ${filterInMeters}
            `)
          ]
        },
        order: literal(`
          6371000 * ACOS(
            COS(RADIANS(${userLatitude})) *
            COS(RADIANS(latitude)) *
            COS(RADIANS(longitude) - RADIANS(${userLongitude})) +
            SIN(RADIANS(${userLatitude})) *
            SIN(RADIANS(latitude))
          )
        `)
      });
      

    const plainDocs = docs.map(doc => doc.get({ plain: true }));

    return res.status(200).json({message:"filtered doctors successfully", doctorDetails: plainDocs})
}


module.exports = filterDoctorByLocation