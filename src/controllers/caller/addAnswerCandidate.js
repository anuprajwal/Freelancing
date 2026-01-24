const logger = require('../../../logger');
const admin = require('./firebaseDbConnect');
const CALL_STATUS = require("./states")

const addAnswerCandidates = async (req, res) => {
    try {
        const {
            call_id,
            answer_candidate
        } = req.body;
        const {
            id: loggedInUserId
        } = req.user.payload;

        const db = admin.firestore();

        // Validate call_id
        if (!call_id || typeof call_id !== "string") {
            return res.status(400).json({
                error: "Valid call_id is required"
            });
        }

        // Validate ICE candidate object
        if (
            !answer_candidate ||
            typeof answer_candidate !== "object" ||
            !answer_candidate.candidate ||
            answer_candidate.sdpMid === undefined ||
            answer_candidate.sdpMLineIndex === undefined
        ) {
            return res.status(400).json({
                error: "Invalid answer_candidate. Required: candidate, sdpMid, sdpMLineIndex"
            });
        }

        const callRef = db.collection("call_history").doc(call_id);
        const callSnap = await callRef.get();

        if (!callSnap.exists) {
            return res.status(404).json({
                error: "Call record not found"
            });
        }

        const callData = callSnap.data();

        // Only the callee can push answer candidates
        if (callData.call_made_to !== loggedInUserId) {
            return res.status(403).json({
                error: "Only the callee can send answer candidates"
            });
        }

        // Reject if call is closed or rejected
        const invalidStates = [CALL_STATUS.REJECTED, CALL_STATUS.COMPLETED];
        if (invalidStates.includes(callData.call_status)) {
            return res.status(409).json({
                error: `Cannot add ICE candidates. Call is ${callData.call_status}`
            });
        }

        // Add ICE candidate
        const ansCandsRef = callRef.collection("answerCandidates");

        await ansCandsRef.add({
            ...answer_candidate,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({
            message: "Answer candidate added successfully"
        });

    } catch (err) {
        logger.error("Error adding answer candidate:", err);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

module.exports = addAnswerCandidates;