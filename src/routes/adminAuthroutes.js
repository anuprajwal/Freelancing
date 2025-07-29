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

router.post("/login", loginAdmin);

//protected routes
router.get("/stats/doctors", verifyAdminAuth, getDoctorCount);
router.get("/stats/patients", verifyAdminAuth, getPatientCount);
router.get("/stats/hospitals", verifyAdminAuth, getHospitalCount);
router.get("/stats/appointments", verifyAdminAuth, getAppointmentCount);
router.post("/send-email", verifyAdminAuth, sendEmails)
router.post("/add-package" , verifyAdminAuth , addPackage);


module.exports = router;
