const { User, doctorProfile, organisationProfile, appointments } = require("../../../models");

const getDoctorCount = async (req, res) => {
  try {
    const count = await doctorProfile.count();
    return res.status(200).json({ totalDoctors: count });
  } catch (err) {
    console.error("Doctor count error:", err);
    return res.status(500).json({ error: "Failed to fetch doctor count" });
  }
};

const getPatientCount = async (req, res) => {
  try {
    const count = await User.count({ where: { role: "general_user" } });
    return res.status(200).json({ totalPatients: count });
  } catch (err) {
    console.error("Patient count error:", err);
    return res.status(500).json({ error: "Failed to fetch patient count" });
  }
};

const getHospitalCount = async (req, res) => {
  try {
    const count = await organisationProfile.count();
    return res.status(200).json({ totalHospitals: count });
  } catch (err) {
    console.error("Hospital count error:", err);
    return res.status(500).json({ error: "Failed to fetch hospital count" });
  }
};

const getAppointmentCount = async (req, res) => {
  try {
    const count = await appointments.count();
    return res.status(200).json({ totalAppointments: count });
  } catch (err) {
    console.error("Appointment count error:", err);
    return res.status(500).json({ error: "Failed to fetch appointment count" });
  }
};

module.exports = {
  getDoctorCount,
  getPatientCount,
  getHospitalCount,
  getAppointmentCount
};
