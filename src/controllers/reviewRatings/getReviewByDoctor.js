const { reviewRating } = require("../../../models");
// const logger = require("../../../logger");

// API to get reviews based on doctor_id
const getReviewsByDoctor = async (req, res) => {
    const { doctor_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // logger.info(`Route to get reviews by doctor_id called for: ${doctor_id}`);

    if (!doctor_id) {
        // logger.warning("Doctor ID is required");
        return res.status(400).json({ error: "Doctor ID is required" });
    }

    try {
        const reviews = await reviewRating.findAll({
            where: { doctor_id },
            order: [["createdAt", "DESC"]],
            limit: limit
        });

        if (!reviews || reviews.length === 0) {
            // logger.info(`No reviews found for doctor_id: ${doctor_id}`);
            return res.status(404).json({ message: "No reviews found" });
        }

        // logger.info(`Fetched ${reviews.length} reviews for doctor_id: ${doctor_id}`);
        return res.status(200).json({ reviews });
    } catch (error) {
        // logger.error(`Error fetching reviews for doctor_id: ${doctor_id} - ${error.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = getReviewsByDoctor;
