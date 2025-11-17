const express = require("express");
const router = express.Router();
const hospitalAdminAuth = require("../middlewares/hospitalAdminVerify")
const  protect  = require("../middlewares/authMiddleware.js");
const checkAccountStatus = require("../middlewares/accountCheck.js")
const createAccounts = require("../controllers/hospitalAdmin/createAccounts.js")
const allAppointments = require("../controllers/hospitalAdmin/getAllAppointments.js")
const getAllDoctors = require("../controllers/hospitalAdmin/getAllDoctors.js")
// const sendEmails = require("../controllers/hospitalAdmin/sendEmails.js")
const removeHospitalStaff = require("../controllers/hospitalAdmin/removeStaff.js")
// const getHospitalRequests = require("../controllers/hospitalAdmin/getSurgeryRequests.js")
const getAllRequests = require("../controllers/hospitalAdmin/getAllRequest.js")
const requestAdmissionRequest = require("../controllers/hospitalAdmin/requestAHospitalAdmission.js")
const acceptDocRequests = require('../controllers/hospitalAdmin/acceptDocRequests.js')



//protected routes
router.post("/create-accounts", checkAccountStatus, protect, hospitalAdminAuth, createAccounts);
router.get("/get-appointments", checkAccountStatus, protect, hospitalAdminAuth, allAppointments);
router.get("/get-doctors", checkAccountStatus, protect, hospitalAdminAuth, getAllDoctors);
// router.post("/send-emails", checkAccountStatus, protect, hospitalAdminAuth, sendEmails);
router.delete("/remove-staff", checkAccountStatus, protect, hospitalAdminAuth,removeHospitalStaff)
// router.get('/get-hospital-surgeries', checkAccountStatus, protect, hospitalAdminAuth,getHospitalRequests)
router.get('/get-admission-request', checkAccountStatus, protect, hospitalAdminAuth, getAllRequests)
router.post('/doctor-request-admission', checkAccountStatus, protect, requestAdmissionRequest)
router.put('/react-to-admission', checkAccountStatus, protect, hospitalAdminAuth, acceptDocRequests)

module.exports = router;
