const { doctorProfile, organisationProfile, documents, address, User } = require("../../../models");

const getUnverifiedAccounts = async (req, res) => {
//   logger.info(`Route to get unverified accounts called by admin`);

  try {
    const unverifiedDoctors = await doctorProfile.findAll({
        where: { verified_status: false },
        include: [      
          {
            model: User,
            as: "user",
            attributes: [
              "username",
              "email",
              "phone_number",
              "created_at",
            ],
            include: [
              {
                model: documents,
                as: "documents",
                attributes: [
                  "id",
                  "document_type",
                  "document_url",
                  "created_at",
                ],
              },
              {
                model: address,
                as: "address",
                required: false,
                where: { active: true },
                attributes: ["city", "state", "pincode", "street"],
              },
            ],
          },
        ],
        attributes: [
          "user_id",
          "specialization",
          "gender",
          "date_of_birth",
          "practice_start_date",
          "license_number",
          "profile_picture",
          "created_at",
        ],
        order: [["created_at", "DESC"]],
      });
      

    const unverifiedOrganisations = await organisationProfile.findAll({
      where: { verified_status: false },
      include: [      
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "username",
            "email",
            "phone_number",
            "created_at",
          ],
          include: [
            {
              model: documents,
              as: "documents",
              attributes: [
                "id",
                "document_type",
                "document_url",
                "created_at",
              ],
            },
            {
              model: address,
              as: "address",
              required: false,
              where: { active: true },
              attributes: ["city", "state", "pincode", "street"],
            },
          ],
        },
      ],
      attributes: [
        "id",
        "organisation_name",
        "organisation_type",
        "regestration_number",
        "website_url",
        "verified_status",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    // logger.info(
    //   `Fetched ${unverifiedDoctors.length} unverified doctors and ${unverifiedOrganisations.length} unverified organisations`
    // );

    return res.status(200).json({
      total_unverified_doctors: unverifiedDoctors.length,
      total_unverified_organisations: unverifiedOrganisations.length,
      unverified_doctors: unverifiedDoctors,
      unverified_organisations: unverifiedOrganisations,
    });
  } catch (err) {
    console.log(err)
    // logger.error(`Error fetching unverified accounts: ${err.message}`);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = getUnverifiedAccounts;
