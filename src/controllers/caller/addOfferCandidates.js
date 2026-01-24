// const logger = require('../../../logger')
// const admin = require('./firebaseDbConnect')

// const addOfferCandidates = async (req, res)=>{
//     const {offer_candidate, call_id} = req.body
//     const {id} = req.user.payload
//     const firebase_db = admin.firestore()

//     if (!offer_candidate){
//         // logger.warning(`Request from user ${id} is missing 'offer_candidate' object`);
//         return res.status(400).json({error:"Missing Offer Candidates in the request"})
//     }

//     if (!offer_candidate.candidate || !offer_candidate.sdpMid || !offer_candidate.sdpMLineIndex){
//         // logger.warning(`Request from user ${id} has an incomplete 'offer_candidate' object (missing 'candidate', 'sdpMid', or 'sdpMLineIndex')`);
//         return res.status(400).json({error:"Missing required fields in offer candidate"})
//     }

//     const call_history = firebase_db.collection('call_history').doc(call_id)
//     const call_history_snap = await call_history.get()

//     if (! call_history_snap.exists){
//         // logger.warning(`Request from user ${id} refers to a non-existent call record in 'call_history'`);
//         return res.status(404).json({error:"Could not find the specified call"})
//     }

//     const call_history_data = call_history_snap.data()

//     if (call_history_data.call_initiated_by !== id){
//         // logger.warning(`User ${id} attempted to send candidate info, but they are not the call initiator (initiator: ${call_history_data.call_initiated_by})`);
//         return res.status(403).json({error:"the candidate we got in the request are not from the calee"})
//     }

//     const call_history_offer_candidate = firebase_db.collection('call_history').doc(call_id).collection('offerCandidates')
//     await call_history_offer_candidate.add(offer_candidate)

//     // logger.info(`request made by the user : ${id} to add candidates is done`)
//     return res.status(200).json({message:"Succesfully added offer candidate"})
// }

// module.exports = addOfferCandidates


const logger = require('../../../logger');
const admin = require('./firebaseDbConnect');
const CALL_STATUS = require("./states")

const addOfferCandidates = async (req, res) => {
    try {
        const {
            offer_candidate,
            call_id
        } = req.body;
        const {
            id: loggedInUserId
        } = req.user.payload;

        // Validate call_id
        if (!call_id || typeof call_id !== "string") {
            return res.status(400).json({
                error: "Valid call_id is required"
            });
        }

        // Validate candidate object
        if (
            !offer_candidate ||
            typeof offer_candidate !== "object" ||
            !offer_candidate.candidate ||
            offer_candidate.sdpMid === undefined ||
            offer_candidate.sdpMLineIndex === undefined
        ) {
            return res.status(400).json({
                error: "Invalid offer_candidate. Required: candidate, sdpMid, sdpMLineIndex",
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

        // Reject if call was already closed or rejected
        const closedStatuses = [CALL_STATUS.REJECTED, CALL_STATUS.COMPLETED];
        if (closedStatuses.includes(callData.call_status)) {
            return res.status(409).json({
                error: `Call cannot accept ICE candidates. Current status: ${callData.call_status}`,
            });
        }

        // Only the call initiator should be pushing offer candidates
        if (callData.call_initiated_by !== loggedInUserId) {
            return res.status(403).json({
                error: "Only the call initiator can send offer candidates.",
            });
        }

        // Add candidate under subcollection
        const offerCandidatesRef = callRef.collection("offerCandidates");

        await offerCandidatesRef.add({
            ...offer_candidate,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({
            message: "Offer candidate added successfully"
        });

    } catch (err) {
        logger.error("Error adding offer candidate:", err);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

module.exports = addOfferCandidates;