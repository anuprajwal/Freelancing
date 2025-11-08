const { doctorProfile, organisationProfile, doctorSlots, User } = require("../../../../models");
// const logger = require("../../../logger");

const getDoctorsByOrganisation = async (req, res) => {
  const { organisation_id } = req.params;
  const { limit = 10, offset = 0 } = req.query;

//   logger.info(`Route to get doctors for organisation_id: ${organisation_id} called.`);

  try {
    // Validate org ID
    if (!organisation_id) {
    //   logger.warn("Missing organisation_id in params");
      return res.status(400).json({ error: "organisation_id is required" });
    }

    // Verify organisation exists
    const organisation = await organisationProfile.findByPk(organisation_id);
    if (!organisation || !organisation.verified_status) {
    //   logger.warn(`Organisation with id ${organisation_id} not found`);
      return res.status(404).json({ error: "Organisation not found" });
    }

    // Fetch doctors linked to the organisation
    const doctors = await doctorProfile.findAll({
      where: { 
        organisation_id,
        verified_status: true, // ✅ only verified doctors
      },      
      include: [
        {
          model: User,
          as: "user",
          attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'], 
          include : [
            {
              model: doctorSlots,
              as : "doctorSlots"
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
      attributes: [
        'id', 
        'user_id', 
        'gender', 
        'specialization', 
        'consultation_fee', 
        'verified_status', 
        'profile_picture', 
        'appointment_time', 
        'description', 
      ]
    });

    // logger.info(
    //   `Fetched ${doctors.length} doctors for organisation_id: ${organisation_id}`
    // );

    return res.status(200).json({
      organisation_id,
      organisation_name: organisation.organisation_name,
      total_doctors: doctors.length,
      doctors,
    });
  } catch (err) {
    console.log(err)
    // logger.error(`Error fetching doctors for organisation_id ${organisation_id}: ${err.message}`);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = getDoctorsByOrganisation;
