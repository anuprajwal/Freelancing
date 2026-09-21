const { User, doctorProfile, organisationProfile } = require("../../models");
const { Op } = require("sequelize");

const setDoctorsSlotConfig = async (req, res) => {
  try {
    const admin_id = req.user.payload.id;
    const { slot_fee, slot_time, filters } = req.body;

    // 1. Basic validation
    if (slot_fee === undefined || slot_time === undefined) {
      return res.status(400).json({
        error: "Both slot_fee and slot_time are required.",
      });
    }

    // 2. Fetch hospital/organisation profile
    const hospital = await organisationProfile.findOne({
      where: { user_id: admin_id },
      attributes: ["id"],
    });

    if (!hospital) {
      return res.status(404).json({
        error: "Hospital profile not found for this admin.",
      });
    }

    // Destructure possible filters (supporting single value or arrays)
    const { names, emails, specializations } = filters || {};

    // 3. Build dynamic 'where' conditions for User and DoctorProfile
    const userWhere = {};
    const doctorProfileWhere = { organisation_id: hospital.id };

    if (names) {
      const nameList = Array.isArray(names) ? names : [names];
      if (nameList.length > 0) {
        userWhere.username = { [Op.in]: nameList };
      }
    }

    if (emails) {
      const emailList = Array.isArray(emails) ? emails : [emails];
      if (emailList.length > 0) {
        userWhere.email = { [Op.in]: emailList };
      }
    }

    if (specializations) {
      const specList = Array.isArray(specializations)
        ? specializations
        : [specializations];
      if (specList.length > 0) {
        doctorProfileWhere.specialization = { [Op.in]: specList };
      }
    }

    // Check if any User-level filters (names/emails) were provided
    const hasUserFilters = Object.keys(userWhere).length > 0;

    let targetDoctorProfileIds = [];

    if (hasUserFilters) {
      // 4a. If filtering by User attributes (name, email), query IDs with inclusion
      const matchedProfiles = await doctorProfile.findAll({
        attributes: ["id"],
        where: doctorProfileWhere,
        include: [
          {
            model: User,
            as: "user", // Ensure this matches your Sequelize association alias
            where: userWhere,
            attributes: [], // Exclude user columns to optimize payload
            required: true,
          },
        ],
      });

      targetDoctorProfileIds = matchedProfiles.map((p) => p.id);

      // If filters yielded 0 matches, return early
      if (targetDoctorProfileIds.length === 0) {
        return res.status(200).json({
          message: "No doctors matched the specified filters.",
          updatedCount: 0,
        });
      }
    }

    // 5. Perform direct, optimized bulk update in database
    const updateWhere = hasUserFilters
      ? { id: { [Op.in]: targetDoctorProfileIds } }
      : doctorProfileWhere; // Targets ALL doctors under organisation if no User filters provided

    const [updatedCount] = await doctorProfile.update(
      {
        consultation_fee: slot_fee,
        appointment_time: slot_time,
      },
      {
        where: updateWhere,
      }
    );

    return res.status(200).json({
      message: `Successfully updated ${updatedCount} doctor profile(s).`,
      updatedCount,
    });
  } catch (err) {
    console.error("Error setting doctor slot configuration:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { setDoctorsSlotConfig };