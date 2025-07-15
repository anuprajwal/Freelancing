const express = require("express");
const router = express.Router();
const  loginAdmin = require("../controllers/admin/adminAuthcontroller.js");
const {
  getDoctorCount,
  getPatientCount,
  getHospitalCount,
  getAppointmentCount
} = require("../controllers/admin/adminPanelstats.js");
const verifyAdminAuth = require("../middlewares/verifyAdminAuth.js");

router.post("/login", loginAdmin);

//protected routes
router.get("/stats/doctors", verifyAdminAuth, getDoctorCount);
router.get("/stats/patients", verifyAdminAuth, getPatientCount);
router.get("/stats/hospitals", verifyAdminAuth, getHospitalCount);
router.get("/stats/appointments", verifyAdminAuth, getAppointmentCount);



module.exports = router;
