const { organisationProfile } = require("../../../models");
const validateUserRole = require("../../utils/validateRole");


// api to complete the organisation profile
const completeOrganisationProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await validateUserRole(id, "organisation", res);
    if (!user) return;

    const {
      organisation_type,
      organisation_name,
      regestration_number,
      establishment_year,
      specializations_provided,
      amount_of_staff,
      ambulance_available,
      contact_number,
      contact_email,
      website_url
    } = req.body;

    if (
      !organisation_type || !organisation_name || !regestration_number ||
      !specializations_provided || !amount_of_staff ||
      !contact_number || !contact_email
    ) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    const profile = await organisationProfile.findOne({ where: { user_id: id } });
    if (!profile) {
      return res.status(403).json({
        error: "Organisation profile not found. Please create it first."
      });
    }

    await profile.update({
      organisation_type,
      organisation_name,
      regestration_number,
      establishment_year,
      specializations_provided,
      amount_of_staff,
      ambulance_available,
      contact_number,
      contact_email,
      website_url
    });

    await user.update({ is_active: true });

    return res.status(200).json({ message: "Organisation profile updated successfully." });
  } catch (error) {
    console.error("Organisation profile update error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { completeOrganisationProfile };
