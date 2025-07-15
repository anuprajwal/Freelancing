const { organisationProfile, address, organisationRatings } = require("../../../models");
const { Op, literal } = require('sequelize');


// the api to filter out the good rated hospitals or organisations and also based on the pincode.
const filterHospitals = async (req, res) => {
    const { id } = req.user.payload;
    const userId = id

    const userAddress = await address.findOne({where: {user_id: userId, active: true}});
    if (!userAddress) {
        return res.status(404).json({ error: "No active address found" });
    }

    let userPincode = userAddress.pincode;
  const { type = ["hospital", "clinic", "pharmacy", "laboratory"], pincode = userPincode.substring(0, 3) } = req.query;
  try {

    const organisations = await organisationProfile.findAll({
        where: {
            organisation_type: {[Op.contains]: type},
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
            [literal(`ABS(pincode - ${userPincode})`), 'ASC']
        ]
    });

    console.log("filtered organisations", organisations);

    return res.status(200).json({ organisations });
  } catch (error) {
    return res.status(500).json({ error: "Failed to filter organisations" });
  }

};

module.exports = filterHospitals;
