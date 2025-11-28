const { documents } = require("../../../models");
// const logger = require("../../../logger");

const getDocuments = async (req, res) => {
  try {
    const targetUserId = req.params.user_id; // incoming from URL param
    // 2. Fetch documents for the given user_id
    const userDocuments = await documents.findAll({
      where: { user_id: targetUserId }
    });

    if (!userDocuments || userDocuments.length === 0) {
      return res.status(404).json({ error: "No documents found for this user" });
    }

    return res.status(200).json({
      message: "Documents fetched successfully",
      documents: userDocuments
    });

  } catch (error) {
    console.error("Error fetching documents:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = getDocuments;
