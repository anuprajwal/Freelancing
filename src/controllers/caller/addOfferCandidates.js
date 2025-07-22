const logger = require('../../../logger')
const admin = require('./firebaseDbConnect')

const addOfferCandidates = async (req, res)=>{
    const {offer_candidate, call_id} = req.body
    const {id} = req.user.payload
    const firebase_db = admin.firestore()

    if (!offer_candidate){
        // logger.warning(`Request from user ${id} is missing 'offer_candidate' object`);
        return res.status(400).json({error:"Missing Offer Candidates in the request"})
    }

    if (!offer_candidate.candidate || !offer_candidate.sdpMid || !offer_candidate.sdpMLineIndex){
        // logger.warning(`Request from user ${id} has an incomplete 'offer_candidate' object (missing 'candidate', 'sdpMid', or 'sdpMLineIndex')`);
        return res.status(400).json({error:"Missing required fields in offer candidate"})
    }

    const call_history = firebase_db.collection('call_history').doc(call_id)
    const call_history_snap = await call_history.get()

    if (! call_history_snap.exists){
        // logger.warning(`Request from user ${id} refers to a non-existent call record in 'call_history'`);
        return res.status(404).json({error:"Could not find the specified call"})
    }

    const call_history_data = call_history_snap.data()

    if (call_history_data.call_initiated_by !== id){
        // logger.warning(`User ${id} attempted to send candidate info, but they are not the call initiator (initiator: ${call_history_data.call_initiated_by})`);
        return res.status(403).json({error:"the candidate we got in the request are not from the calee"})
    }

    const call_history_offer_candidate = firebase_db.collection('call_history').doc(call_id).collection('offerCandidates')
    await call_history_offer_candidate.add(offer_candidate)

    // logger.info(`request made by the user : ${id} to add candidates is done`)
    return res.status(200).json({message:"Succesfully added offer candidate"})
}

module.exports = addOfferCandidates