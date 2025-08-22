const updateLocation = async (req, res) => {
  try {
    const userId = req.user.payload.id;
    const { latitude, longitude} = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude, longitude are required" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.latitude = latitude;
    user.longitude = longitude;
    await user.save();

    res.json({
      message: "Location updated successfully",
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong while saving current location", details: err.message });
  }
};

module.exports = updateLocation