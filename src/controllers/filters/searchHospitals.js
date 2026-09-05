const { organisationProfile, address, User } = require("../../../models");
const { Op, Sequelize } = require("sequelize");

const searchHospitals = async (req, res) => {
  try {
    const { name = "" } = req.query;

    let organisations;

    // If search query exists → search using LIKE
    if (name && name.trim() !== "") {
      organisations = await organisationProfile.findAll({
        
        include: [
          {model: User, as: "user", where: { verified_status: true, username: { [Op.like]: `%${name}%` } }, attributes: ["id", "email", "phone_number"], include: [{model: address, as: "address"}]},
        ],
        limit: 15
      });
    } 
    // Else → Return random 15 hospitals
    else {
      organisations = await organisationProfile.findAll({
        where: {
          verified_status: true
        },
        include: [
          {model: User, as: "user", where: { verified_status: true }, attributes: ["id", "email", "phone_number"], include: [{model: address, as: "address"}]},
         
        ],
        order: Sequelize.literal("RAND()"),  // Random sorting
        limit: 15
      });
    }

    return res.status(200).json({ organisations });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to search organisations" });
  }
};

module.exports = searchHospitals;
