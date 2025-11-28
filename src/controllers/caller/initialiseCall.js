// const admin = require('./firebaseDbConnect')
// const {User, notificationTokens} = require('../../../models')
// // const { logger } = require('../../../logger')



// const initialiseCall = async (req, res)=>{
//     try{
//         const {id} = req.user.payload

//         // logger.info(`request to start a call from the user: ${id} is recieved`)
//         const {call_to_user = null, offer = null} = req.body
//         const firebase_db = admin.firestore()

//         if (!call_to_user || !offer){
//             // logger.warning(`the request from the user: ${id} has no proper fields`)
//             return res.status(400).json({error:"Call to user and offer cant be found"})
//         }

//         const caleeObj = await User.findByPk(call_to_user);
//         const callerObj = await User.findByPk(id)

//         if (!caleeObj){
//             // logger.warning(`Caller with id ${id} tried to call user ${call_to_user}, but callee account was not found`);
//             return res.status(400).json({error:`Can't find account of the Calee with id ${id}`})
//         }

//         if (!offer.sdp && !offer.type){
//             // logger.warning(`Caller with id ${id} provided an invalid offer object (missing 'sdp' and 'type')`);
//             return res.status(400).json({error:"Offer structure not valid"})
//         }


//         const callHistoryDoc = firebase_db.collection('call_history').doc()


//         const callerDoc = firebase_db.collection('calls').doc(id+"") .collection('history').doc(callHistoryDoc.id)
//         const caleeDoc = firebase_db.collection('calls').doc(call_to_user+"") .collection('history').doc(callHistoryDoc.id)


//         const callRequest = {
//             call_from_userid : id,
//             call_from_user : callerObj.username,
//             call_from_email : callerObj.email,
//             call_from_phone_number : callerObj.phone_number,
//             call_to_userid : call_to_user,
//             call_to_user : caleeObj.username,
//             call_to_email : caleeObj.email,
//             call_to_phone_number : caleeObj.phone_number
//         }

//         await callHistoryDoc.set({ offer, call_initiated_by:id, call_made_to: call_to_user, call_status:"Call Initialised" }, { merge: true });

//         await callerDoc.set({call_request: callRequest, call_id : callHistoryDoc.id}, {merge: true})
//         await caleeDoc.set({call_request: callRequest, call_id : callHistoryDoc.id}, {merge:true})

//         const allRelatedTokens = await notificationTokens.findAll({where:{user_id : call_to_user}})

//         const allTokens = allRelatedTokens.map(each=>{
//             admin.messaging().send({
//             token: each.token,
//             notification: {
//               title: `Incoming Call`,
//               body: `Call from ${caleeObj.username}`,
//               call_details:JSON.stringify(callRequest),
//               call_id : callHistoryDoc.id
//             }
//         });
//         })


        

//         // logger.info(`the request to make the call by user: ${id} is done`)
//         return res.status(200).json({message:"Call initiated succesfully", call_id : callerDoc.id})
//     }catch(err){
//         // logger.error(`error in the file of initialising the call : ${err}`)
//         return res.status(500).json({error:`error in server, ${err}`})
//     }
// }


// module.exports = initialiseCall


const admin = require('./firebaseDbConnect'); // firebase admin instance
const { User, notificationTokens, appointments } = require('../../../models');
const logger = require('../../../logger'); // optional
const { Op } = require('sequelize');

/**
 * Initialise a call between appointment participants.
 * Request body: { appointment_id, offer }
 * Caller: req.user.payload.id
 *
 * Behaviour:
 *  - Only appointment doctor or patient can initiate.
 *  - Reject if either participant already has an active call.
 *  - Create call history doc with status "Ringing" and expires_at (now + WAIT_TIME).
 *  - Add per-user call entries under calls/<userId>/history/<callId>.
 *  - Send FCM push to callee tokens with call metadata.
 */
const WAIT_TIME_SECONDS = parseInt(process.env.CALL_RING_WAIT_SECONDS || '45', 10); // configurable via .env

const ACTIVE_CALL_STATUSES = ['Ringing', 'In Progress', 'Call Initialised']; // treat as busy

const initialiseCall = async (req, res) => {
  const firebaseDb = admin.firestore();
  try {
    const callerId = req.user?.payload?.id;
    if (!callerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointment_id: appointmentId, offer } = req.body;
    if (!appointmentId || !offer) {
      return res.status(400).json({ error: 'appointment_id and offer are required' });
    }

    // Validate offer structure
    if (!offer.sdp || !offer.type) {
      return res.status(400).json({ error: "Offer must contain 'sdp' and 'type'" });
    }

    // Fetch appointment and both users in parallel
    const appointment = await appointments.findOne({ where: { id: appointmentId } });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Determine role of caller and the callee id
    let calleeId = null;
    let callerRole = null; // 'doctor' | 'patient'
    if (parseInt(appointment.doctor_id, 10) === parseInt(callerId, 10)) {
      callerRole = 'doctor';
      calleeId = appointment.user_id;
    } else if (parseInt(appointment.user_id, 10) === parseInt(callerId, 10)) {
      callerRole = 'patient';
      calleeId = appointment.doctor_id;
    } else {
      return res.status(403).json({ error: 'You are not a participant in this appointment' });
    }

    // Fetch caller and callee user objects
    const [callerObj, calleeObj] = await Promise.all([
      User.findByPk(callerId),
      User.findByPk(calleeId),
    ]);

    if (!callerObj) return res.status(404).json({ error: "Caller account not found" });
    if (!calleeObj) return res.status(404).json({ error: "Callee account not found" });

    // Optional business rule: only start call for certain appointment_status values (e.g., confirmed)
    const ALLOWED_APPOINTMENT_STATUSES = process.env.ALLOWED_CALL_APPOINTMENT_STATUSES
      ? process.env.ALLOWED_CALL_APPOINTMENT_STATUSES.split(',').map(s => s.trim())
      : ['confirmed', 'pending']; // you can adjust via .env
    if (!ALLOWED_APPOINTMENT_STATUSES.includes(appointment.appointment_status)) {
      return res.status(403).json({
        error: `Cannot make call for appointment in status: ${appointment.appointment_status}`
      });
    }

    // Helper: check if a user has an active call (non-expired)
    const userHasActiveCall = async (userId) => {
      const userCallsRef = firebaseDb.collection('calls').doc(String(userId)).collection('history');
      // query for active statuses and not expired
      const now = Date.now();
      const snapshot = await userCallsRef
        .where('call_status', 'in', ACTIVE_CALL_STATUSES)
        .get();

      if (snapshot.empty) return false;

      // if any doc has expires_at and it is in future, treat as active
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.expires_at) {
          // if no expires_at, consider it active (safe side)
          return true;
        }
        const expiresAt = data.expires_at.toMillis ? data.expires_at.toMillis() : new Date(data.expires_at).getTime();
        if (expiresAt > now) return true;
      }
      return false;
    };

    // Check busy states
    const [callerBusy, calleeBusy] = await Promise.all([
      userHasActiveCall(callerId),
      userHasActiveCall(calleeId)
    ]);

    if (callerBusy) {
      return res.status(409).json({ error: 'You already have an active call' });
    }

    if (calleeBusy) {
      return res.status(409).json({ error: 'The other user is busy in another call' });
    }

    // Build call metadata
    const now = new Date();
    const expiresAt = new Date(now.getTime() + WAIT_TIME_SECONDS * 1000);

    const callRequest = {
      call_from_userid: callerId,
      call_from_user: callerObj.username || null,
      call_from_email: callerObj.email || null,
      call_from_phone_number: callerObj.phone_number || null,
      call_to_userid: calleeId,
      call_to_user: calleeObj.username || null,
      call_to_email: calleeObj.email || null,
      call_to_phone_number: calleeObj.phone_number || null,
      appointment_id: appointmentId,
      initiated_at: admin.firestore.Timestamp.fromDate(now),
    };

    // Create call history doc (server-generated id)
    const callHistoryDocRef = firebaseDb.collection('call_history').doc();
    const callDocData = {
      offer,
      call_initiated_by: callerId,
      call_made_to: calleeId,
      call_status: 'Ringing', // initial status
      call_request: callRequest,
      created_at: admin.firestore.Timestamp.fromDate(now),
      expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    // Use a batch write to ensure atomic-ish writes to multiple locations
    const batch = firebaseDb.batch();

    batch.set(callHistoryDocRef, callDocData, { merge: true });

    const callerDocRef = firebaseDb.collection('calls').doc(String(callerId)).collection('history').doc(callHistoryDocRef.id);
    const calleeDocRef = firebaseDb.collection('calls').doc(String(calleeId)).collection('history').doc(callHistoryDocRef.id);

    const perUserEntry = {
      call_request: callRequest,
      call_id: callHistoryDocRef.id,
      call_status: 'Ringing',
      created_at: admin.firestore.Timestamp.fromDate(now),
      expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    batch.set(callerDocRef, perUserEntry, { merge: true });
    batch.set(calleeDocRef, perUserEntry, { merge: true });

    // Commit batch
    await batch.commit();

    // Send FCM notifications to callee's tokens (if any)
    const allRelatedTokens = await notificationTokens.findAll({
      where: { user_id: calleeId }
    });

    // If no tokens — still return success; client side may handle fallback
    if (allRelatedTokens && allRelatedTokens.length > 0) {
      const sendPromises = allRelatedTokens.map(tok => {
        const payload = {
          token: tok.token,
          notification: {
            title: 'Incoming Call',
            body: `Call from ${callerObj.username || 'Unknown'}`,
          },
          data: {
            call_details: JSON.stringify(callRequest),
            call_id: callHistoryDocRef.id,
            appointment_id: String(appointmentId),
            action: 'INCOMING_CALL',
          }
        };
        // return promise
        return admin.messaging().send(payload);
      });

      try {
        // await all; if some fail we log but still succeed overall
        const sendResults = await Promise.allSettled(sendPromises);
        sendResults.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.warn(`Failed to send notification to token ${allRelatedTokens[idx].token}:`, r.reason);
          }
        });
      } catch (err) {
        console.error('Error sending notifications (non-fatal):', err);
      }
    }

    // Return call metadata to caller
    return res.status(200).json({
      message: 'Call initiated',
      call_id: callHistoryDocRef.id,
      call_status: 'Ringing',
      expires_at: expiresAt.toISOString(),
      callee_id: calleeId,
      callee_role: appointment.doctor_id === calleeId ? 'doctor' : 'patient'
    });

  } catch (err) {
    console.error('initialiseCall error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = initialiseCall;
