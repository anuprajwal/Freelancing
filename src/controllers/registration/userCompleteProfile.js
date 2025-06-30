const User = require("../../../models/user.js");
const { completePatientProfile } = require("./completePatProfile.js");
// const { completeDoctorProfile } = require("./completeDocProfile.js");
// const { completeOrganisationProfile } = require("./completeOrgProfile.js");

// function to map functions of the profile updatings of each interface
export const completeProfile = async (req, res) => {
  try {
    const { userId } = req.user; // Extracted from authentication middleware
    const { profile } = req.body; // Profile contains role-specific details

    if (!profile) return res.status(400).json({ error: "Profile data is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Call role-specific controllers
    if (user.role === "patient") {
      return completePatientProfile(req, res, user);
    } else if (user.role === "doctor") {
      return completeDoctorProfile(req, res, user);
    } else if (user.role === "organisation") {
      return completeOrganisationProfile(req, res, user);
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
