const { User, doctorProfile, organisationProfile } = require("../../../models");
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

    userWhere.role = "doctor"; // Ensure we only target doctors

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

    const syncResult = await saveDoctorSlotConfig(
      admin_id,
      slot_fee,
      slot_time,
      filters
    );

    return res.status(200).json({
      message: `Successfully updated ${updatedCount} doctor profile(s).`,
      updatedCount,
      syncResult,
    });
  } catch (err) {
    console.error("Error setting doctor slot configuration:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};


const saveDoctorSlotConfig = async (userId, slotFee, slotTime, filters) => {
  const { names, emails, specializations } = filters || {};

  const nameList = names ? (Array.isArray(names) ? names : [names]) : [];
  const emailList = emails ? (Array.isArray(emails) ? emails : [emails]) : [];
  const specList = specializations ? (Array.isArray(specializations) ? specializations : [specializations]) : [];

  const hasIndividualFilters = nameList.length > 0 || emailList.length > 0;
  const hasSpecFilters = specList.length > 0;

  // Find or initialize the AdditionalProfile record for this user_id
  let [profile] = await AdditionalProfile.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      overall: null,
      individual: [],
      specialisation: []
    }
  });

  // CASE 1: Overall update (No specific individual or specialisation filters)
  if (!hasIndividualFilters && !hasSpecFilters) {
    profile.overall = {
      slot_fee: slotFee,
      slot_time: slotTime,
      updated_at: new Date()
    };

    await profile.save();
    return { type: "OVERALL", message: "Overall slot configuration replaced." };
  }

  // CASE 2: Specific Doctor (Individual filter based on names / emails)
  if (hasIndividualFilters) {
    let currentIndividual = Array.isArray(profile.individual) ? [...profile.individual] : [];

    // Construct targets to match
    const newDoctorsToProcess = [];
    const maxLen = Math.max(nameList.length, emailList.length);

    for (let i = 0; i < maxLen; i++) {
      newDoctorsToProcess.push({
        name: nameList[i] || null,
        email: emailList[i] || null
      });
    }

    for (const targetDoc of newDoctorsToProcess) {
      // Find index of existing record matching name OR email
      const existingIdx = currentIndividual.findIndex((item) => {
        const nameMatch = targetDoc.name && item.name === targetDoc.name;
        const emailMatch = targetDoc.email && item.email === targetDoc.email;
        return nameMatch || emailMatch;
      });

      if (existingIdx !== -1) {
        // Update existing item
        currentIndividual[existingIdx] = {
          ...currentIndividual[existingIdx],
          name: targetDoc.name || currentIndividual[existingIdx].name,
          email: targetDoc.email || currentIndividual[existingIdx].email,
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: new Date()
        };
      } else {
        // Add new entry
        currentIndividual.push({
          name: targetDoc.name,
          email: targetDoc.email,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: new Date()
        });
      }
    }

    profile.individual = currentIndividual;
    await profile.save();
    return { type: "INDIVIDUAL", message: "Individual doctor configurations updated." };
  }

  // CASE 3: Specific Specialisation
  if (hasSpecFilters) {
    let currentSpec = Array.isArray(profile.specialisation) ? [...profile.specialisation] : [];

    for (const specName of specList) {
      const existingIdx = currentSpec.findIndex((item) => item.specialisation === specName);

      if (existingIdx !== -1) {
        // Update existing specialization item
        currentSpec[existingIdx] = {
          ...currentSpec[existingIdx],
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: new Date()
        };
      } else {
        // Add new specialization item
        currentSpec.push({
          specialisation: specName,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: new Date()
        });
      }
    }

    profile.specialisation = currentSpec;
    await profile.save();
    return { type: "SPECIALISATION", message: "Specialisation slot configurations updated." };
  }
};


module.exports = { setDoctorsSlotConfig };