const express = require("express");
const  scheduleAppointment  = require("../controllers/appointment/createAppointment.js");
const  deleteAppointment  = require("../controllers/appointment/deleteAppointment.js");
const  updateAppointment  = require("../controllers/appointment/updateAppointment.js");
const  showAllAppointments  = require("../controllers/appointment/showAllAppointments.js");
const  protect  = require("../middlewares/authMiddleware.js");
const appointmentUpdateByDoctor = require("../controllers/appointment/doctorUpdateAppointments.js");
const scheduleCheckup = require("../controllers/appointment/sceduleCheckup.js");
const getHospitalSlots = require("../controllers/appointment/getHospitalSlots.js")
const { verifyPaymentAndAppointment, verifyPaymentAndCheckup } = require("../controllers/appointment/confirmPaymentAndAppointment.js")




const router = express.Router();

router.post("/create-appointment", protect, scheduleAppointment);
router.delete("/delete-appointment", protect, deleteAppointment);
router.put("/update-appointment", protect, updateAppointment);
router.get("/list-appointments", protect, showAllAppointments);
router.put("/doctor-update-appointment", protect, appointmentUpdateByDoctor)
router.post("/schedule-checkup-appointment", protect, scheduleCheckup)
router.get("/get-hospital-slots/:hospitalId", getHospitalSlots)
router.put("/confirm-appointment", protect, verifyPaymentAndAppointment)
router.put("/confirm-checkup", protect, verifyPaymentAndCheckup)



module.exports = router;