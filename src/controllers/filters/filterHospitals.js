const { organisationProfile, address, organisationRatings } = require("../../../models");
const { Op } = require('sequelize');


// the api to filter out the good rated hospitals or organisations and also based on the pincode.
const filterHospitals = async (req, res) => {


  const { type = ["hospital", "clinic", "pharmacy", "laboratory"], pincode } = req.query;
  try {

    const organisations = await organisationProfile.findAll({
        where: {
            ...(type ? { organisation_type: { [Op.contains]: type } } : {}),
            verified_status: true
        },
        include: [{
            model: address,
            where: {
                active: true,
                pincode: {[Op.like]: `${pincode}%`},
            },
            on: {
                user_id: { [Op.eq]: Sequelize.col('organisationProfile.user_id') } 
            },
            as: "address",
            include: [
            {
                model: organisationRatings,
                as: "organisationRatings",
                required: true,
                attributes: ["organisation_rating"],
                where:{
                    organisation_id: { [Op.eq]: Sequelize.col('organisationProfile.id') }
                },
                on: {
                    organisation_id: { [Op.eq]: Sequelize.col('organisationProfile.id') }
                }
            }
        ]
        }],        
        order: [
            ['organisationRatings.organisation_rating', 'DESC'],
        ]
    });

    console.log("filtered organisations", organisations);

    return res.status(200).json({ organisations });
  } catch (error) {
    return res.status(500).json({ error: "Failed to filter organisations" });
  }

};

module.exports = filterHospitals;
