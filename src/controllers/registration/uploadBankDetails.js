const { doctorProfile, organisationProfile } = require("../../../models");
// const logger = require("../../../logger");

const uploadBankDetails = async (req, res) => {
  const { id, scope } = req.user.payload;

//   logger.info(`Bank details upload request by user: ${id} with role: ${role}`);

  const {
    account_number = "",
    beneficiary_name = "",
    ifsc_code = ""
  } = req.body;

  // Input validation
  if (!account_number || !beneficiary_name || !ifsc_code) {
    // logger.warn(`Missing required bank fields by user: ${id}`);
    return res.status(400).json({ error: "All fields are required" });
  }

  if (account_number.length < 6) {
    return res.status(400).json({ error: "Invalid account number" });
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
    return res.status(400).json({ error: "Invalid IFSC code format" });
  }

  try {
    let updateModel;

    if (scope === "doctor") {
      updateModel = doctorProfile;
    } 
    else if (scope === "hospital_organisation") {
      updateModel = organisationProfile;
    } 
    else {
    //   logger.warn(`User ${id} is not allowed to upload bank details`);
      return res.status(403).json({ error: "Only doctor or hospital organisation can add bank details" });
    }

    // Update bank details in correct model
    await updateModel.update(
      {
        account_number,
        beneficiary_name,
        ifsc_code
      },
      {
        where: { user_id: id }
      }
    );

    // logger.info(`Bank details updated successfully for user: ${id}`);
    return res.status(200).json({ message: "Bank details uploaded successfully" });

  } catch (error) {
    // logger.error(`Error uploading bank details for ${id}: ${error}`);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = uploadBankDetails;
