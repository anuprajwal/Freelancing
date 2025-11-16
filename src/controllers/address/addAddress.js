const { address } = require("../../../models");
const logger = require('../../../logger');

// API to add a new address
const addAddress = async (req, res) => {
  const { id } = req.user.payload;

  logger.info(`Route to add address is called by user: ${id}`);

  const {
    country = "India",
    state = "",
    city = "",
    pincode = "",
    street = "",
    landmark = "",
    houseNo = ""
  } = req.body;

  // Validation
  if (!city || !pincode || !street) {
    logger.warning(`Missing required fields for user: ${id}`);
    return res.status(400).json({ error: "City, pincode, and street are required" });
  }

  if (pincode.length !== 6) {
    logger.warning(`Invalid pincode entered by user: ${id}`);
    return res.status(400).json({ error: "Pincode must be exactly 6 digits" });
  }

  try {
    // 1️⃣ Delete all previous addresses
    await address.destroy({
      where: { user_id: id }
    });

    // 2️⃣ Create new address
    await address.create({
      user_id: id,
      country: country,
      state: state,
      city: city,
      pincode: pincode,
      street: street,
      landmark: landmark,
      house_no: houseNo,
      active: true,
    });

    logger.info(`Successfully updated address for user: ${id}`);

    return res.status(200).json({ message: "Address added successfully" });

  } catch (err) {
    logger.error(`Error while adding address for user: ${id} → ${err}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = addAddress;
