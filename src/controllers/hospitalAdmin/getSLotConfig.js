const { orgPaymentManagement } = require("../../../models");

const getSlotConfig = async (req, res) => {
  try {
    const { id } = req.user.payload;

    const record = await orgPaymentManagement.findOne({
      where: { user_id: id }
    });

    if (!record) {
      return res.status(404).json({ error: "Profile record not found." });
    }

    return res.status(200).json({
      message: "Successfully fetched profile record.",
      data: record
    });
  } catch (err) {
    console.error("Error fetching profile record:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = getSlotConfig;