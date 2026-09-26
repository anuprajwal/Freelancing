const { User, doctorProfile, organisationProfile, orgPaymentManagement } = require("../../../models");
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

  // Find or create the profile
  let [profile] = await orgPaymentManagement.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      overall: null,
      individual: [],
      specialisation: []
    }
  });

  // CASE 1: Overall update
  if (!hasIndividualFilters && !hasSpecFilters) {
    profile.overall = {
      slot_fee: slotFee,
      slot_time: slotTime,
      updated_at: new Date()
    };
    profile.changed('overall', true);
    await profile.save();
    return { type: "OVERALL", message: "Overall config updated." };
  }

  // CASE 2: Specific Doctor (Individual)
  if (hasIndividualFilters) {
    // Sequelize automatically parses DataTypes.JSON columns into JS arrays, 
    // but we ensure it defaults to an array safely.
    let currentIndividual = Array.isArray(profile.individual) ? profile.individual : [];

    const updatedIndividual = [...currentIndividual];
    const maxLen = Math.max(nameList.length, emailList.length);
    const now = new Date();

    for (let i = 0; i < maxLen; i++) {
      const name = nameList[i] ? nameList[i].trim() : null;
      const email = emailList[i] ? emailList[i].trim() : null;

      if (!name && !email) continue;

      // Search existing array for a match by email OR name
      const existingIndex = updatedIndividual.findIndex((item) => {
        const emailMatch = email && item.email && item.email.trim().toLowerCase() === email.toLowerCase();
        const nameMatch = name && item.name && item.name.trim().toLowerCase() === name.toLowerCase();
        return emailMatch || nameMatch;
      });

      if (existingIndex !== -1) {
        // UPDATE existing record: update fee & time, retain created_at
        const existing = updatedIndividual[existingIndex];
        updatedIndividual[existingIndex] = {
          ...existing,
          name: name || existing.name,
          email: email || existing.email,
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: now
        };
      } else {
        // APPEND new record: add to the list without overwriting older records
        updatedIndividual.push({
          name,
          email,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: now,
          updated_at: now
        });
      }
    }

    // Assign the array directly. DO NOT use JSON.stringify() here.
    profile.individual = updatedIndividual;
    profile.changed('individual', true);
    await profile.save();
    
    return { type: "INDIVIDUAL", message: "Individual configs merged and updated." };
  }

  // CASE 3: Specific Specialisation
  if (hasSpecFilters) {
    let currentSpec = Array.isArray(profile.specialisation) ? profile.specialisation : [];
    const updatedSpec = [...currentSpec];
    const now = new Date();

    for (const specName of specList) {
      if (!specName) continue;
      const cleanSpec = specName.trim();

      const existingIndex = updatedSpec.findIndex(
        (item) => item.specialisation && item.specialisation.trim().toLowerCase() === cleanSpec.toLowerCase()
      );

      if (existingIndex !== -1) {
        const existing = updatedSpec[existingIndex];
        updatedSpec[existingIndex] = {
          ...existing,
          specialisation: cleanSpec,
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: now
        };
      } else {
        updatedSpec.push({
          specialisation: cleanSpec,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: now,
          updated_at: now
        });
      }
    }

    // Assign the array directly. DO NOT use JSON.stringify() here.
    profile.specialisation = updatedSpec;
    profile.changed('specialisation', true);
    await profile.save();

    return { type: "SPECIALISATION", message: "Specialisation configs merged and updated." };
  }
};


module.exports = { setDoctorsSlotConfig };