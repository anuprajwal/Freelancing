const{package} = require("../../../models");

const addPackage = async (req, res) => {
  const { packageName, packageDetails, price } = req.body;

  try {
    // Validate input
    if (!packageName || !packageDetails || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create new package
    const newPackage = await package.create({
      packageName,
      packageDetails,
      price,
    });

    return res.status(201).json({ message: "Package added successfully", package: newPackage });
  } catch (err) {
    console.error("Error adding package:", err);
    return res.status(500).json({ error: "Failed to add package" });
  }
}
module.exports = addPackage;