const logger = require('../../../logger');
const admin = require('./firebaseDbConnect');

const getOfferSdp = async (req, res) => {
    try {
        const {
            call_id
        } = req.query; // we take call_id from query
        const {
            id: loggedInUserId
        } = req.user.payload;

        console.log(loggedInUserId)

        // Validate call_id
        if (!call_id || typeof call_id !== "string") {
            return res.status(400).json({
                error: "Valid call_id is required"
            });
        }

        const db = admin.firestore();
        const callRef = db.collection("call_history").doc(call_id);
        const callSnap = await callRef.get();

        if (!callSnap.exists) {
            return res.status(404).json({
                error: "Call record not found"
            });
        }

        const callData = callSnap.data();

        // Optional: Restrict access to participants only
        if (![callData.call_initiated_by, callData.call_to_user].includes(loggedInUserId)) {
            return res.status(403).json({
                error: "You are not allowed to access this call offer."
            });
        }

        // Retrieve offer SDP
        const offer_sdp = callData.offer_sdp || null;

        if (!offer_sdp) {
            return res.status(404).json({
                error: "Offer SDP not found for this call."
            });
        }

        return res.status(200).json({
            call_id,
            offer_sdp
        });

    } catch (err) {
        logger.error("Error fetching offer SDP:", err);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

module.exports = getOfferSdp;