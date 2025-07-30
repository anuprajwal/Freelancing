const admin = require("../caller/firebaseDbConnect")

const functions = require('firebase-functions');

const sendCampaignNotification = functions.firestore
  .document('campaigns/{docId}')
  .onCreate(async (snap, context) => {
    const campaign = snap.data();

    const payload = {
      notification: {
        title: campaign.title,
        body: campaign.message,
      },
      token: campaign.targetFcmToken,
    };

    try {
      const response = await admin.messaging().send(payload); // FCM still uses real service
      console.log('✅ Successfully sent message:', response);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  });

module.exports = {
  sendCampaignNotification,
};
