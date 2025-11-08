const express = require("express");
const router = express.Router();
const  loginAdmin = require("../controllers/admin/adminAuthcontroller.js");
const {
  getDoctorCount,
  getPatientCount,
  getHospitalCount,
  getAppointmentCount,
} = require("../controllers/admin/adminPanelstats.js");
const sendEmails = require("../controllers/admin/sendEmails.js")
const verifyAdminAuth = require("../middlewares/verifyAdminAuth.js");
const addPackage = require("../controllers/admin/addPackage.js");
const {approveDoctors, approveHospitals} = require("../controllers/registration/verify.js")
const registerAdmin = require("../controllers/admin/regesterAdmin.js")


router.post("/login", loginAdmin);
router.post("/disabled/admin/create/acc", registerAdmin)

//protected routes
router.get("/stats/doctors", verifyAdminAuth, getDoctorCount);
router.get("/stats/patients", verifyAdminAuth, getPatientCount);
router.get("/stats/hospitals", verifyAdminAuth, getHospitalCount);
router.get("/stats/appointments", verifyAdminAuth, getAppointmentCount);
router.post("/send-email", verifyAdminAuth, sendEmails)
router.post("/add-package" , verifyAdminAuth , addPackage);
router.put("/approve-doctor", verifyAdminAuth, approveDoctors)
router.put("/approve-hospital", verifyAdminAuth, approveHospitals)


module.exports = router;
