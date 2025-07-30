const { managerProfile, agentProfile, User } = require("../../../models");

const completeManagerProfile = async (req, res) => {
  const { id } = req.manager;
  const { managed_pincode, city } = req.body;

  if (!managed_pincode || !city) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const existing = await managerProfile.findOne({ where: { user_id: id } });
    if (existing) {
      await existing.update({ managed_pincode, city });
      return res.status(200).json({ message: "Profile updated" });
    }

    await managerProfile.create({ user_id: id, managed_pincode, city });
    await User.update({ is_active: true }, { where: { id } });

    res.status(201).json({ message: "Manager profile created" });
  } catch (err) {
    res.status(500).json({ error: "Error completing manager profile" });
  }
};

module.exports = completeManagerProfile;