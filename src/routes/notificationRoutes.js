const express = require("express");
const router = express.Router();
const saveUserToken = require("../controllers/notifications/save-user-token")
// const deleteUserToken = require('../controllers/notifications/delete-user-token')
// require("../controllers/notifications/create-notification")
// const sendNotification = require("../controllers/notifications/send-notification")

//protected routes
router.post("/save-token", saveUserToken);
// router.get("/create-notification", createNotification);
// router.get("/get-doctors", getAllDoctors);
// router.post("/send-emails", sendEmails);



module.exports = router;
