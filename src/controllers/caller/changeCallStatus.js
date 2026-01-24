// const admin = require('./firebaseDbConnect')
// const { FieldValue } = require('firebase-admin/firestore');


// const changeCallStatus = async (req, res)=>{
//     try{
//         const {call_id, call_status} = req.body
//         const {id} = req.user.payload

//         // logger.info(`request to change the call status is made by the user: ${id}`)
//         if (!call_id){
//           // logger.warning(`Call status update failed: Missing call_id from request made by user: ${id}`);
//             return res.status(400).json({error:'Call id is needed to reject a call'})
//         }

//         if (call_status !== 'Call on hold' || call_status !== 'Call rejected' || call_status !== 'Call Complete'){
//             // logger.warning(`Call status update failed: Invalid call_status '${call_status}' provided by user: ${id}`);
//             return res.status(400).json({warning:'Value of call status is not valid'})
//         }

//         const firebase_db = admin.firestore()

//         const call_history = firebase_db.collection('call_history').doc(call_id) 
//         const call_history_snap = await call_history.get()

//         if (!call_history_snap.exists){
//             // logger.warning(`Call status update failed: No records found for call_id ${call_id}`);
//             return res.status(400).json({error:`no records found with the call id: ${call_id}`})
//         }

//         await call_history.set({call_status : call_status}, {merge:true})

//         if (call_status === 'Call rejected'){
//             try{
//                 await processRejectingCall(call_history, firebase_db)
//                 // logger.info(`Call rejection logic executed successfully for call_id ${call_id}`);
//             }catch(e){
//                 // logger.error(`Call rejection failed for call_id ${call_id}: ${e}`);
//                 return res.status(500).json({error:`Internal server error: ${e}`})
//             }
//         }
//         // logger.info(`Final response: call_id ${call_id} status update completed successfully`);
//         return res.status(200).json({message:'Succesfully updated call status'})
//     }catch (err){
//         // logger.error(`error at file changeCallStatus: ${err}`)
//         return res.status(500).json({error:`internal server error: ${err}`})
//     }
// }

// const processRejectingCall = async (call_history, firebase_db)=>{
//     const subcollections = await call_history.listCollections();
//     for (const subcollection of subcollections) {
//       await deleteCollectionRecursively(subcollection, 10, firebase_db);
//     }
// }


// async function deleteCollectionRecursively(collectionRef, batchSize = 10, firebase_db) {
//   const query = collectionRef.limit(batchSize);

//   const snapshot = await query.get();

//   if (snapshot.empty) {
//     return;
//   }

//   const batch = firebase_db.batch();

//   for (const doc of snapshot.docs) {
//     // Delete subcollections recursively
//     const subcollections = await doc.ref.listCollections();

//     for (const subcollection of subcollections) {
//       await deleteCollectionRecursively(subcollection, batchSize, firebase_db);
//     }

//     // Queue the document for deletion
//     batch.delete(doc.ref);
//   }

//   await batch.commit();

//   // Process next batch
//   return deleteCollectionRecursively(collectionRef, batchSize, firebase_db);
// }


// module.exports = changeCallStatus


const admin = require('./firebaseDbConnect');

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

        if (!VALID_STATUSES.includes(call_status)) {
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

        if (call_status !== "COMPLETED") {
            return res.status(400).json({
                error: "Invalid status"
            });
        }

        if (currentStatus === "COMPLETED") {
            return res.status(400).json({
                error: "Call already completed"
            });
        }

        await callHistoryRef.set({
            call_status: "COMPLETED",
            ended_by: id,
            ended_at: admin.firestore.Timestamp.now()
        }, {
            merge: true
        });


        // ---------------- PROCESS REJECTION CLEANUP ----------------
        if (call_status === "Call Rejected") {
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