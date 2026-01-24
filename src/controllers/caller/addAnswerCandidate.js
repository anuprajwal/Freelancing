// const { logger } = require('../../../logger')
// const admin = require('./firebaseDbConnect')

// const addAnswerCandidates = async (req, res)=>{
//     const {call_id, answer_candidate} = req.body
//     const {id} = req.user.payload

//     // logger.info(`Request to add candidated from calee side is made by the user : ${id}`)
//     const firebase_db = admin.firestore()

//     if (!answer_candidate){
//         // logger.warning(`candidates are missing from the calee : ${id}`)
//         return res.status(400).json({error:"Missing Answer Candidates in the request"})
//     }

//     if (!answer_candidate.candidate || !answer_candidate.sdpMid || !answer_candidate.sdpMLineIndex){
//         // logger.warning(`candidates are not in correct fields by the calee: ${id}`)
//         return res.status(400).json({error:"Missing required fields in answer candidate"})
//     }

//     const call_history = firebase_db.collection('call_history').doc(call_id)
//     const call_history_snap = await call_history.get()

//     if (!call_history_snap.exists){
//         // logger.warning(`couldnot find the call: ${call_id} the calee: ${id} is requesting for`)
//         return res.status(404).json({error:"Could not find the specified call"})
//     }

//     const call_history_data = call_history_snap.data()

//     if (call_history_data.call_made_to !== id){
//         // logger.warning(`the candidated recieved are not from the calee: ${id}`)
//         return res.status(403).json({error:"the candidate we got in the request are not from the calee"})
//     }

//     const call_history_offer_candidate = firebase_db.collection('call_history').doc(call_id).collection('answerCandidates')
//     await call_history_offer_candidate.add(answer_candidate)

//     // logger.info(`request to add the candidates from the calee : ${id} side is done`)
//     return res.status(200).json({message:"Succesfully added answer candidate"})
// }

// module.exports = addAnswerCandidates




const logger = require('../../../logger');
const admin = require('./firebaseDbConnect');

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
        const invalidStates = ["Call Rejected", "Call Completed"];
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