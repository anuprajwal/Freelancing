const admin = require('firebase-admin');
const serviceAccount = require('../../../videocall-174e6-firebase-adminsdk-fbsvc-c3715fdb23.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://videocall-174e6.firebaseio.com"
  });
}

module.exports = admin;
