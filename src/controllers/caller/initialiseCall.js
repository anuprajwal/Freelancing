const admin = require('./firebaseDbConnect')
const {User} = require('../../../models')
const { merge } = require('../../routes/userRoutes')
// const { logger } = require('../../../logger')



const initialiseCall = async (req, res)=>{
    try{
        const {id} = req.user.payload

        // logger.info(`request to start a call from the user: ${id} is recieved`)
        const {call_to_user = null, offer = null} = req.body
        const firebase_db = admin.firestore()

        if (!call_to_user || !offer){
            // logger.warning(`the request from the user: ${id} has no proper fields`)
            return res.status(400).json({error:"Call to user and offer cant be found"})
        }

        const caleeObj = await User.findByPk(call_to_user);
        const callerObj = await User.findByPk(id)

        if (!caleeObj){
            // logger.warning(`Caller with id ${id} tried to call user ${call_to_user}, but callee account was not found`);
            return res.status(400).json({error:`Can't find account of the Calee with id ${id}`})
        }

        if (!offer.sdp && !offer.type){
            // logger.warning(`Caller with id ${id} provided an invalid offer object (missing 'sdp' and 'type')`);
            return res.status(400).json({error:"Offer structure not valid"})
        }


        const callHistoryDoc = firebase_db.collection('call_history').doc()


        const callerDoc = firebase_db.collection('calls').doc(id+"") .collection('history').doc(callHistoryDoc.id)
        const caleeDoc = firebase_db.collection('calls').doc(call_to_user+"") .collection('history').doc(callHistoryDoc.id)


        const callRequest = {
            call_from_userid : id,
            call_from_user : callerObj.username,
            call_from_email : callerObj.email,
            call_from_phone_number : callerObj.phone_number,
            call_to_userid : call_to_user,
            call_to_user : caleeObj.username,
            call_to_email : caleeObj.email,
            call_to_phone_number : caleeObj.phone_number
        }

        await callHistoryDoc.set({ offer, call_initiated_by:id, call_made_to: call_to_user, call_status:"Call Initialised" }, { merge: true });

        await callerDoc.set({call_request: callRequest, call_id : callHistoryDoc.id}, {merge: true})
        await caleeDoc.set({call_request: callRequest, call_id : callHistoryDoc.id}, {merge:true})

        await firebase_db.collection('campaigns').add({
            title: 'Offer Alert!',
            message: '50% off on all items today only!',
            targetFcmToken: 'dcxfHBkQOLf32k3_NkaDRL:APA91bHnvzm14dwKu2P9KmhOqr0vswyp2yWFIpCze23kiMErjCAWBuRKkdp91GdcI-qu_ar_8OzImmIwNBHEmh8TkaUy1xadKgJFolnkkN2sp5OXOhWoWW8'
          });
          

        // logger.info(`the request to make the call by user: ${id} is done`)
        return res.status(200).json({message:"Call initiated succesfully", call_id : callerDoc.id})
    }catch(err){
        // logger.error(`error in the file of initialising the call : ${err}`)
        return res.status(500).json({error:`error in server, ${err}`})
    }
}


module.exports = initialiseCall