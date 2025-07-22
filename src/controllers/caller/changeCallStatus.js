const admin = require('./firebaseDbConnect')
const { FieldValue } = require('firebase-admin/firestore');


const changeCallStatus = async (req, res)=>{
    try{
        const {call_id, call_status} = req.body
        const {id} = req.user.payload

        // logger.info(`request to change the call status is made by the user: ${id}`)
        if (!call_id){
          // logger.warning(`Call status update failed: Missing call_id from request made by user: ${id}`);
            return res.status(400).json({error:'Call id is needed to reject a call'})
        }

        if (call_status !== 'Call on hold' || call_status !== 'Call rejected' || call_status !== 'Call Complete'){
            // logger.warning(`Call status update failed: Invalid call_status '${call_status}' provided by user: ${id}`);
            return res.status(400).json({warning:'Value of call status is not valid'})
        }

        const firebase_db = admin.firestore()

        const call_history = firebase_db.collection('call_history').doc(call_id) 
        const call_history_snap = await call_history.get()

        if (!call_history_snap.exists){
            // logger.warning(`Call status update failed: No records found for call_id ${call_id}`);
            return res.status(400).json({error:`no records found with the call id: ${call_id}`})
        }

        await call_history.set({call_status : call_status}, {merge:true})

        if (call_status === 'Call rejected'){
            try{
                await processRejectingCall(call_history, firebase_db)
                // logger.info(`Call rejection logic executed successfully for call_id ${call_id}`);
            }catch(e){
                // logger.error(`Call rejection failed for call_id ${call_id}: ${e}`);
                return res.status(500).json({error:`Internal server error: ${e}`})
            }
        }
        // logger.info(`Final response: call_id ${call_id} status update completed successfully`);
        return res.status(200).json({message:'Succesfully updated call status'})
    }catch (err){
        // logger.error(`error at file changeCallStatus: ${err}`)
        return res.status(500).json({error:`internal server error: ${err}`})
    }
}

const processRejectingCall = async (call_history, firebase_db)=>{
    const subcollections = await call_history.listCollections();
    for (const subcollection of subcollections) {
      await deleteCollectionRecursively(subcollection, 10, firebase_db);
    }
}


async function deleteCollectionRecursively(collectionRef, batchSize = 10, firebase_db) {
  const query = collectionRef.limit(batchSize);

  const snapshot = await query.get();

  if (snapshot.empty) {
    return;
  }

  const batch = firebase_db.batch();

  for (const doc of snapshot.docs) {
    // Delete subcollections recursively
    const subcollections = await doc.ref.listCollections();

    for (const subcollection of subcollections) {
      await deleteCollectionRecursively(subcollection, batchSize, firebase_db);
    }

    // Queue the document for deletion
    batch.delete(doc.ref);
  }

  await batch.commit();

  // Process next batch
  return deleteCollectionRecursively(collectionRef, batchSize, firebase_db);
}


module.exports = changeCallStatus