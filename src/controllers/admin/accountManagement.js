const { User } = require("../../../models");

// Hold Account
const holdAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.account_status = "holded";
    await user.save();

    return res.status(200).json({ message: "Account has been put on hold" });
  } catch (err) {
    console.error("Error holding account:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Account
const deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.account_status = "deleted";
    await user.save();

    return res.status(200).json({ message: "Account has been deleted" });
  } catch (err) {
    console.error("Error deleting account:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Resume Account
const resumeAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.account_status = "active";
    await user.save();

    return res.status(200).json({ message: "Account has been resumed" });
  } catch (err) {
    console.error("Error resuming account:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Holded Accounts
const getHoldedAccounts = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { account_status: "holded" },
      attributes: { exclude: ["password"] }
    });

    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    console.error("Error fetching holded accounts:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  holdAccount,
  deleteAccount,
  resumeAccount,
  getHoldedAccounts
};
