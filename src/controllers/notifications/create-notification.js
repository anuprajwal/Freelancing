// const admin = require('../caller/firebaseDbConnect');


// const message = {
//     token: fcmToken,
//     notification: {
//       title: 'New Offer!',
//       body: '🔥 Limited-time deal just for you!',
//     }
//   };

// admin.messaging().send(message)
//   .then((response) => {
//     console.log('Successfully sent message:', response);
//   })
//   .catch((error) => {
//     console.error('Error sending message:', error);
//   });



const functions = require("firebase-functions");
const admin = require("../caller/firebaseDbConnect");

const db = admin.firestore();

const sendScheduledNotifications = functions.pubsub
    .schedule("every 1 minutes").onRun(async (context) => {

  const now = new Date();

  const snapshot = await db.collection("campaigns")
    .where("sendAt", "<=", now.toISOString())
    .where("status", "==", "pending")
    .get();

  if (snapshot.empty) {
    console.log("No campaigns to send.");
    return null;
  }

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const message = {
      tokens: data.tokens,
      notification: {
        title: data.title,
        body: data.body,
      }
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log("Notification sent:", response.successCount);
    } catch (error) {
      console.error("Error sending notification:", error);
    }

    // Update status to prevent resending
    batch.update(doc.ref, { status: "sent" });
  }

  await batch.commit();
  return null;
});


module.exports = sendScheduledNotifications