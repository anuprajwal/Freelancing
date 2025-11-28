const { reviewRating } = require("../../../models");
// const logger = require("../../../logger");

// API to get reviews based on appointment_id
const getReviewsByAppointment = async (req, res) => {
    const { appointment_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // logger.info(`Route to get reviews by appointment_id called for: ${appointment_id}`);

    if (!appointment_id) {
        // logger.warning("Appointment ID is required");
        return res.status(400).json({ error: "Appointment ID is required" });
    }

    try {
        const reviews = await reviewRating.findAll({
            where: { appointment_id },
            order: [["createdAt", "DESC"]],
            limit: limit
        });

        if (!reviews || reviews.length === 0) {
            // logger.info(`No reviews found for appointment_id: ${appointment_id}`);
            return res.status(404).json({ message: "No reviews found" });
        }

        // logger.info(`Fetched ${reviews.length} reviews for appointment_id: ${appointment_id}`);
        return res.status(200).json({ reviews });
    } catch (error) {
        // logger.error(`Error fetching reviews for appointment_id: ${appointment_id} - ${error.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = getReviewsByAppointment;
