const { managerProfile, agentProfile, User } = require("../../models");
const addAgent = async (req, res) => {
  const { id } = req.manager;
  const { full_name, contact_number, language_spoken } = req.body;

  if (!full_name || !contact_number || !language_spoken) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const manager = await managerProfile.findOne({ where: { user_id: id } });
    if (!manager) return res.status(404).json({ error: "Manager profile not found" });

    const agent = await agentProfile.create({
      manager_id: manager.id,
      full_name,
      contact_number,
      language_spoken,
    });

    res.status(201).json({ message: "Agent added", agent });
  } catch (err) {
    res.status(500).json({ error: "Failed to add agent" });
  }
};

module.exports = addAgent;