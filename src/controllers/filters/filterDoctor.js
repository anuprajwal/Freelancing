const { doctorProfile, address, doctorRatings } = require("../../../models");
const { Op, literal } = require('sequelize');


// api to filter list of doctors based on the location using the pincode, ratings.
//this is less dynamic, it must be modified to much dynamic version on resuming the project.
const filterDoctor = async (req, res) => {
    const { userId } = req.user;

    const userAddress = await address.findOne({where: {user_id: userId, active: true}});
    if (!userAddress) {
        return res.status(404).json({ error: "No active address found" });
    }

    let userPincode = userAddress.pincode;
  const { specialization, pincode = userPincode.substring(0, 3) } = req.query;
  try {

    const doctors = await doctorProfile.findAll({
        where: {
            specialization: {[Op.contains]: specialization},
        },
        include: [{
            model: address,
            where: {
                active: true,
                pincode: {[Op.like]: `${pincode}%`},
            },
            on: {
                user_id: { [Op.eq]: Sequelize.col('doctorProfile.user_id') } 
            },
            as: "address",
            include: [
            {
                model: doctorRatings,
                as: "doctorRatings",
                required: true,
                attributes: ["doctor_rating"],
                where:{
                    doctor_id: { [Op.eq]: Sequelize.col('doctorProfile.id') }
                },
                on: {
                    doctor_id: { [Op.eq]: Sequelize.col('doctorProfile.id') }
                }
            }
        ]
        }],        
        order: [
            ['doctorRatings.doctor_rating', 'DESC'],
            [literal(`ABS(pincode - ${userPincode})`), 'ASC']
        ]
    });

    console.log("filtered doctors", doctors);

    return res.status(200).json({ doctors });
  } catch (error) {
    return res.status(500).json({ error: "Failed to filter doctor" });
  }

};

module.exports = filterDoctor;
