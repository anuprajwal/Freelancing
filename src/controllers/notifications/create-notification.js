const admin = require('../caller/firebaseDbConnect');


const message = {
    token: fcmToken,
    notification: {
      title: 'New Offer!',
      body: '🔥 Limited-time deal just for you!',
    }
  };

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.error('Error sending message:', error);
  });
