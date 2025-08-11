const express = require("express");
const router = express.Router();
const hospitalAdminAuth = require("../middlewares/hospitalAdminVerify")
const  protect  = require("../middlewares/authMiddleware.js");
const createAccounts = require("../controllers/hospitalAdmin/createAccounts.js")
const allAppointments = require("../controllers/hospitalAdmin/getAllAppointments.js")
const getAllDoctors = require("../controllers/hospitalAdmin/getAllDoctors.js")
const sendEmails = require("../controllers/hospitalAdmin/sendEmails.js")
const removeHospitalStaff = require("../controllers/hospitalAdmin/removeStaff.js")
const getHospitalRequests = require("../controllers/hospitalAdmin/getSurgeryRequests.js")
const getAllRequests = require("../controllers/hospitalAdmin/getAllRequest.js")
const requestAdmissionRequest = require("../controllers/hospitalAdmin/requestAHospitalAdmission.js")
const acceptDocRequests = require('../controllers/hospitalAdmin/acceptDocRequests.js')



//protected routes
router.post("/create-accounts", protect, hospitalAdminAuth, createAccounts);
router.get("/get-appointments", protect, hospitalAdminAuth, allAppointments);
router.get("/get-doctors", protect, hospitalAdminAuth, getAllDoctors);
router.post("/send-emails", protect, hospitalAdminAuth, sendEmails);
router.delete("/remove-staff", protect, hospitalAdminAuth,removeHospitalStaff)
router.get('/get-hospital-surgeries', protect, hospitalAdminAuth,getHospitalRequests)
router.get('/get-admission-request', protect, hospitalAdminAuth, getAllRequests)
router.post('/doctor-request-admission', protect, requestAdmissionRequest)
router.put('/react-to-admission', protect, hospitalAdminAuth, acceptDocRequests)

module.exports = router;
