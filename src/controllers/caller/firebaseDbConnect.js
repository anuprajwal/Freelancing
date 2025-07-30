const admin = require('firebase-admin');
const serviceAccount = require('../../../videocall-174e6-firebase-adminsdk-fbsvc-c3715fdb23.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://videocall-174e6.firebaseio.com"
  });
}


// process.env.FIRESTORE_EMULATOR_HOST = '13.200.105.135:8080';

// const emulatorApp = !admin.apps.find(app => app.name === 'emulatorApp')
//   ? admin.initializeApp({}, 'emulatorApp')
//   : admin.app('emulatorApp');

module.exports = admin;
