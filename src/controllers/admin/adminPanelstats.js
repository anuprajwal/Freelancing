const { User, doctorProfile, organisationProfile, appointments } = require("../../../models");

const getAllStats = async (req, res) => {
  try {
    // Run all count queries in parallel for maximum speed
    const [
      totalDoctors,
      totalPatients,
      totalHospitals,
      totalAppointments
    ] = await Promise.all([
      doctorProfile.count(),
      User.count({ where: { role: "general_user" } }),
      organisationProfile.count(),
      appointments.count()
    ]);

    return res.status(200).json({
      message: "Stats fetched successfully",
      stats: {
        totalDoctors,
        totalPatients,
        totalHospitals,
        totalAppointments
      }
    });

  } catch (err) {
    console.error("Stats fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

module.exports = getAllStats;
