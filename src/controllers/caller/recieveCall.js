const admin = require('./firebaseDbConnect');
const CALL_STATUS = require("./states")


const receiveCall = async (req, res) => {
    try {
        const {
            call_id,
            answer
        } = req.body;
        const {
            id
        } = req.user.payload;
        const firebase_db = admin.firestore();

        // ---------------- Validation ----------------
        if (!call_id || !answer) {
            return res.status(400).json({
                error: "call_id and answer are required"
            });
        }

        if (!answer.sdp || !answer.type) {
            return res.status(400).json({
                error: "Invalid answer object"
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

        // ---------------- Validation of Call State ----------------

        if ([CALL_STATUS.COMPLETED, CALL_STATUS.REJECTED].includes(callData.call_status)) {
            return res.status(400).json({
                error: "Call is already closed"
            });
        }


        // ---------------- Ensure This User Is The Receiver ----------------
        if (callData.call_made_to !== id) {
            return res.status(403).json({
                error: "You are not the receiver of this call"
            });
        }

        // ---------------- Update Call State to Answered ----------------
        await callHistoryDoc.set({
            answer,
            call_status: CALL_STATUS.ANSWERED,
            call_answered_at: new Date().toISOString()
        }, {
            merge: true
        });

        return res.status(200).json({
            message: "Call accepted successfully"
        });

    } catch (err) {
        console.error("Receive Call Error:", err);
        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
};

module.exports = receiveCall;