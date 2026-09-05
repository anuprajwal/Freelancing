const { doctorProfile, address, User } = require("../../../models");
const { Op, Sequelize } = require("sequelize");

const searchDoctors = async (req, res) => {
  try {
    const { name = "" } = req.query;

    const trimmedName = name.trim();
    const isSearchQuery = Boolean(trimmedName);

    const whereClause = {
      verified_status: true,
      ...(isSearchQuery && {
        doctor_name: {
          [Op.like]: `%${trimmedName}%`
        }
      })
    };

    const doctors = await doctorProfile.findAll({
      where: whereClause,
      include: [
        {model : User, as: "user", attributes: ["id", "email", "phone_number"], include: [{model: address, as: "address"}]},
      ],

      ...(isSearchQuery ? {} : { order: Sequelize.literal("RAND()") }),
      limit: 15
    });

    return res.status(200).json({ doctors });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to search doctors" });
  }
};

module.exports = searchDoctors;