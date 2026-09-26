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
    await profile.save();
    return { type: "OVERALL", message: "Overall config updated." };
  }

  // CASE 2: Specific Doctor (Individual) - Optimized using a Map/Dictionary
  if (hasIndividualFilters) {
    // 1. Convert current array into a Map using email (or name as fallback) as the unique key for O(1) lookup
    const map = new Map();
    const currentIndividual = Array.isArray(profile.individual) ? profile.individual : [];
    
    for (const item of currentIndividual) {
      const key = (item.email || item.name || "").toLowerCase();
      if (key) map.set(key, item);
    }

    const maxLen = Math.max(nameList.length, emailList.length);
    const now = new Date();

    for (let i = 0; i < maxLen; i++) {
      const name = nameList[i] || null;
      const email = emailList[i] || null;
      const lookupKey = (email || name || "").toLowerCase();

      if (!lookupKey) continue;

      if (map.has(lookupKey)) {
        // Update existing record in-place, keeping original created_at
        const existing = map.get(lookupKey);
        map.set(lookupKey, {
          ...existing,
          name: name || existing.name,
          email: email || existing.email,
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: now
        });
      } else {
        // Insert new record
        map.set(lookupKey, {
          name,
          email,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: now,
          updated_at: now
        });
      }
    }

    // Convert Map back to array
    profile.individual = Array.from(map.values());
    profile.changed('individual', true); // Force Sequelize to detect JSON change
    await profile.save();
    
    return { type: "INDIVIDUAL", message: "Individual configs synchronized." };
  }

  // CASE 3: Specific Specialisation - Optimized using a Map/Dictionary
  if (hasSpecFilters) {
    const map = new Map();
    const currentSpec = Array.isArray(profile.specialisation) ? profile.specialisation : [];

    for (const item of currentSpec) {
      const key = (item.specialisation || "").toLowerCase();
      if (key) map.set(key, item);
    }

    const now = new Date();

    for (const specName of specList) {
      if (!specName) continue;
      const lookupKey = specName.toLowerCase();

      if (map.has(lookupKey)) {
        const existing = map.get(lookupKey);
        map.set(lookupKey, {
          ...existing,
          specialisation: specName,
          slot_fee: slotFee,
          slot_time: slotTime,
          updated_at: now
        });
      } else {
        map.set(lookupKey, {
          specialisation: specName,
          slot_fee: slotFee,
          slot_time: slotTime,
          created_at: now,
          updated_at: now
        });
      }
    }

    profile.specialisation = Array.from(map.values());
    profile.changed('specialisation', true); // Force Sequelize to detect JSON change
    await profile.save();

    return { type: "SPECIALISATION", message: "Specialisation configs synchronized." };
  }
};


module.exports = { setDoctorsSlotConfig };