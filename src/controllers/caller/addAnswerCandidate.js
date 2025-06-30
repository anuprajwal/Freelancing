const { logger } = require('../../../logger')
const admin = require('./firebaseDbConnect')

const addAnswerCandidates = async (req, res)=>{
    const {call_id, payload, answer_candidate} = req.body
    const {id} = payload

    logger.info(`Request to add candidated from calee side is made by the user : ${id}`)
    const firebase_db = admin.firestore()

    if (!answer_candidate){
        logger.warning(`candidates are missing from the calee : ${id}`)
        return res.status(400).json({error:"Missing Answer Candidates in the request"})
    }

    if (!answer_candidate.candidate || !answer_candidate.sdpMid || !answer_candidate.sdpMLineIndex){
        logger.warning(`candidates are not in correct fields by the calee: ${id}`)
        return res.status(400).json({error:"Missing required fields in answer candidate"})
    }

    const call_history = firebase_db.collection('call_history').doc(call_id)
    const call_history_snap = await call_history.get()

    if (!call_history_snap.exists){
        logger.warning(`couldnot find the call: ${call_id} the calee: ${id} is requesting for`)
        return res.status(404).json({error:"Could not find the specified call"})
    }

    const call_history_data = call_history_snap.data()

    if (call_history_data.call_made_to !== id){
        logger.warning(`the candidated recieved are not from the calee: ${id}`)
        return res.status(403).json({error:"the candidate we got in the request are not from the calee"})
    }

    const call_history_offer_candidate = firebase_db.collection('call_history').doc(call_id).collection('answerCandidates')
    await call_history_offer_candidate.add(answer_candidate)

    logger.info(`request to add the candidates from the calee : ${id} side is done`)
    return res.status(200).json({message:"Succesfully added answer candidate"})
}

module.exports = addAnswerCandidates