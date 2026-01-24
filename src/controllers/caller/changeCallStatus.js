const admin = require('./firebaseDbConnect');
const CALL_STATUS = require("./states")

const changeCallStatus = async (req, res) => {
    try {
        const {
            call_id,
            call_status
        } = req.body;
        const {
            id
        } = req.user.payload;

        if (!call_id || !call_status) {
            return res.status(400).json({
                error: "call_id and call_status are required"
            });
        }

        // ---------------- VALID STATUSES ----------------
        const VALID_STATUSES = ["Call on hold", "Call Rejected", "Call Complete"];

        if (![CALL_STATUS.REJECTED, CALL_STATUS.COMPLETED].includes(call_status)) {
            return res.status(400).json({
                error: "Invalid call_status value"
            });
        }

        const firebase_db = admin.firestore();

        // ---------------- FETCH CALL HISTORY ----------------
        const callHistoryRef = firebase_db.collection("call_history").doc(call_id);
        const callSnap = await callHistoryRef.get();

        if (!callSnap.exists) {
            return res.status(404).json({
                error: "Call not found"
            });
        }

        const callData = callSnap.data();

        const {
            call_initiated_by,
            call_made_to,
            call_status: currentStatus
        } = callData;

        // ---------------- CHECK IF USER IS PART OF CALL ----------------
        if (id !== call_initiated_by && id !== call_made_to) {
            return res.status(403).json({
                error: "You are not a participant of this call"
            });
        }

        if (call_status !== CALL_STATUS.COMPLETED) {
            return res.status(400).json({
                error: "Invalid status"
            });
        }

        if (currentStatus === CALL_STATUS.COMPLETED) {
            return res.status(400).json({
                error: "Call already completed"
            });
        }

        await callHistoryRef.set({
            call_status: CALL_STATUS.COMPLETED,
            ended_by: id,
            ended_at: admin.firestore.Timestamp.now()
        }, {
            merge: true
        });


        // ---------------- PROCESS REJECTION CLEANUP ----------------
        if (call_status === CALL_STATUS.REJECTED) {
            await cleanupCallHistory(callHistoryRef, firebase_db);
        }

        return res.status(200).json({
            message: "Call status updated successfully"
        });

    } catch (err) {
        console.error("Error in changeCallStatus:", err);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


const cleanupCallHistory = async (callHistoryRef, firebase_db) => {
    const subcols = await callHistoryRef.listCollections();

    for (const sub of subcols) {
        await deleteCollectionRecursively(sub, 10, firebase_db);
    }
};


async function deleteCollectionRecursively(collectionRef, batchSize = 10, firebase_db) {
    const snapshot = await collectionRef.limit(batchSize).get();

    if (snapshot.empty) return;

    const batch = firebase_db.batch();

    for (const doc of snapshot.docs) {
        const subcols = await doc.ref.listCollections();

        for (const sub of subcols) {
            await deleteCollectionRecursively(sub, batchSize, firebase_db);
        }

        batch.delete(doc.ref);
    }

    await batch.commit();

    return deleteCollectionRecursively(collectionRef, batchSize, firebase_db);
}


module.exports = changeCallStatus