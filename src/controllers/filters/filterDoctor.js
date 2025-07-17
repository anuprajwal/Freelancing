const { doctorProfile, address, doctorSlots, User } = require("../../../models");
const { Op, literal, Sequelize } = require('sequelize');


// api to filter list of doctors based on the location using the pincode, ratings.
//this is less dynamic, it must be modified to much dynamic version on resuming the project.
const filterDoctor = async (req, res) => {
    const { id } = req.user.payload;
    const userId = id

    console.log("user found",userId)

    const userAddress = await address.findOne({where: {user_id: userId}});
    if (!userAddress) {
        return res.status(404).json({ error: "No active address found" });
    }

    let userPincode = userAddress.pincode;
  const { specialization, pincode = userPincode.substring(0, 3) } = req.query;
  try {
    const doctors = await doctorProfile.findAll({
      where: specialization ? { specialization } : {},
      attributes: ["id", "user_id", "date_of_birth", "gender", "specialization", "experience_years", "consultation_fee", "verified_status", "profile_picture", "appointment_time"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'], 
          include : [
            {
              model: doctorSlots,
          as : "doctorSlots"
            }
          ]
        }
      ]
      });
      

    console.log("filtered doctors", doctors);

    return res.status(200).json({ doctors });
  } catch (error) {
    console.log(`error fount: ${error}`)
    return res.status(500).json({ error: `Failed to filter doctor:${error}` });
  }

};

module.exports = filterDoctor;
