const admin = require('./firebaseDbConnect');
const CALL_STATUS = require("./states")

const NON_REJECTABLE_STATES = ["In Progress", "Call Completed"];



const rejectCall = async (req, res) => {
    try {
        const {
            call_id
        } = req.body;
        const {
            id
        } = req.user.payload;
        const firebase_db = admin.firestore();

        if (!call_id) {
            return res.status(400).json({
                error: "call_id is required"
            });
        }

        // ---------------- Fetch Call History ----------------
        const callHistoryDoc = firebase_db.collection("call_history").doc(call_id);
        const callSnap = await callHistoryDoc.get();

        if (!callSnap.exists) {
            return res.status(404).json({
                error: "Call not found"
            });
        }

        const callData = callSnap.data();

        // ---------------- Validate State ----------------
        if ([CALL_STATUS.COMPLETED, CALL_STATUS.IN_PROGRESS].includes(callData.call_status)) {
            return res.status(400).json({
                error: "Call cannot be rejected now"
            });
        }

        // ---------------- Ensure This User Is The Receiver ----------------
        if (callData.call_made_to !== id) {
            return res.status(403).json({
                error: "You are not the receiver of this call"
            });
        }

        // ---------------- Update Call to Rejected ----------------
        await callHistoryDoc.set({
            call_status: CALL_STATUS.REJECTED,
            call_rejected_by: id,
            call_rejected_at: admin.firestore.Timestamp.now()
        }, {
            merge: true
        });


        return res.status(200).json({
            message: "Call rejected successfully"
        });

    } catch (err) {
        console.error("Reject Call Error:", err);
        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
};

module.exports = rejectCall;