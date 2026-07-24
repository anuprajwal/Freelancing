const { User } = require("../../../models");
const { Op, Sequelize } = require("sequelize");

const searchAccounts = async (req, res) => {
  try {
    const { search = "" } = req.query;

    let results;

    if (search && search.trim() !== "") {
      results = await User.findAll({
        where: {
          [Op.or]: [
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
            { username: { [Op.like]: `%${search}%` } }
          ]
        },
        limit: 10,
        order: [["createdAt", "DESC"]] // optional sorting
      });
    } else {
      // No search → return random 10 accounts
      results = await User.findAll({
        order: Sequelize.literal("RAND()"),
        limit: 10
      });
    }

    return res.status(200).json({ accounts: results });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to search accounts" });
  }
};

module.exports = searchAccounts;
