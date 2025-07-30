const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
      const response = await admin.messaging().send(payload);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

module.exports = {
  sendCampaignNotification,
};
