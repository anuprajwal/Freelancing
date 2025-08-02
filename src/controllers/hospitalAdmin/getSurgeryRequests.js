const { surgeryRequest, organisationProfile } = require("../../../models");
const getHospitalRequests = async (req, res) => {
  try {
    const admin_id = req.user.payload.id;

    const hospital = await organisationProfile.findOne({ where: { user_id: admin_id } });
    if (!hospital) {
      return res.status(404).json({ error: "Hospital profile not found" });
    }

    const requests = await surgeryRequest.findAll({
      where: { hospital_id: hospital.id },
      order: [["created_at", "DESC"]]
    });

    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("Error fetching hospital requests:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = getHospitalRequests