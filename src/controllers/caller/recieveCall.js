const admin = require('./firebaseDbConnect')

const recieveCall = async (req, res)=>{
    const {call_id, payload, answer} = req.body
    const {id} = payload

    logger.info(`request to recieve call is found from the user: ${id}`)
    const firebase_db = admin.firestore()

    if (!call_id || !answer){
        logger.error(`Receive call failed: Missing call_id or answer in request body`);
        return res.status(400).json({error:"Call id and answer cant be found"})
    }

    if (!answer.sdp || !answer.type){
        logger.error(`Receive call failed: Invalid answer structure from user ${id}`);  
        return res.status(400).json({error:"Answer structure is not valid"})
    }

    
    const call_history_doc = firebase_db.collection('call_history').doc(call_id);
    const call_history_snap = await call_history_doc.get();

    if (!call_history_snap.exists) {
        logger.error(`Receive call failed: No call history found for call_id ${call_id}`);
        return res.status(404).json({ error: "Could not find the specified call" });
    }

    const call_history_data = call_history_snap.data();

    const caller_doc = firebase_db
        .collection('calls')
        .doc(call_history_data.call_initiated_by+'')
        .collection("history")
        .doc(call_id);

    const calee_doc = firebase_db
        .collection('calls')
        .doc(call_history_data.call_made_to+'')
        .collection("history")
        .doc(call_id);

    // Fetch both caller and callee history docs in parallel
    const [caller_snap, calee_snap] = await Promise.all([
        caller_doc.get(),
        calee_doc.get()
    ]);

    if (caller_snap.exists && calee_snap.exists) {
        if (call_history_data.call_status !== 'Call Initialised') {
            logger.error(`Receive call failed: Call with id ${call_id} is not in 'Call Initialised' state`);
            return res.status(400).json({ error: "Call is not in initial state" });
        }

        if (call_history_data.call_made_to !== id){
            logger.error(`Receive call failed: User ${id} tried to answer a call not made to them (expected: ${call_history_data.call_made_to})`);
            return res.status(403).json({error: "Call is not made to this user"})
        }

        await call_history_doc.set(
            { answer, call_status: "Call Answered" },
            { merge: true }
        );

        logger.info(`Call answered successfully: User ${id} answered call_id ${call_id}`);
        return res.status(200).json({ message: "Answer SDP is successfully set" });
    } else {
        logger.error(`Receive call failed: Missing call history for caller or callee (call_id: ${call_id})`);
        return res.status(404).json({ error: "Couldnot find the calee and caller" });
    }

}

module.exports = recieveCall