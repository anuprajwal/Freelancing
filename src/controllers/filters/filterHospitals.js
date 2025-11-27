const { organisationProfile, address } = require("../../../models");
const { Op, Sequelize } = require('sequelize');


// the api to filter out the good rated hospitals or organisations and also based on the pincode.
const filterHospitals = async (req, res) => {


  const { type = ["hospital", "clinic", "pharmacy", "laboratory"], pincode } = req.query;
  try {
    console.log(type, pincode)
    const organisations = await organisationProfile.findAll({
        where: {
          ...(type ? { organisation_type: { [Op.in]: Array.isArray(type) ? type : [type] } } : {}),
          verified_status: true
        },
        include: [
            {
                model : address,
                as:"address"
              },
        ]});
      
    return res.status(200).json({ organisations });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Failed to filter organisations" });
  }

};

module.exports = filterHospitals;
