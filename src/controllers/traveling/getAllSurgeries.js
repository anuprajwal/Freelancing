// this lists all the hospitals that offer surgeries searched by the user
const { organisationProfile } = require("../../models");

const searchHospitalsBySurgery = async (req, res) => {
  try {
    const keyword = req.query.keyword?.toLowerCase();
    const city = req.query.city?.toLowerCase(); 

    if (!keyword) {
      return res.status(400).json({ error: "Search keyword is required" });
    }

    const hospitals = await organisationProfile.findAll({
      where: {
        verified_status: "approved" 
      }
    });

    const filteredHospitals = hospitals.filter(hospital => {
      const specializations = hospital.specializations_provided || [];

      const match = specializations.some(spec =>
        spec.toLowerCase().includes(keyword)
      );

      const cityMatch = city
        ? (hospital.city?.toLowerCase() === city)
        : true;

      return match && cityMatch;
    });

    return res.status(200).json({
      count: filteredHospitals.length,
      results: filteredHospitals
    });
  } catch (err) {
    console.error("Error in surgery search:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = searchHospitalsBySurgery
