const express = require("express");
const  scheduleAppointment  = require("../controllers/appointment/createAppointment.js");
const  deleteAppointment  = require("../controllers/appointment/deleteAppointment.js");
const  showAllAppointments  = require("../controllers/appointment/showAllAppointments.js");
const  protect  = require("../middlewares/authMiddleware.js");
const appointmentUpdateByDoctor = require("../controllers/appointment/doctorUpdateAppointments.js");
const scheduleCheckup = require("../controllers/appointment/sceduleCheckup.js");
const { verifyPaymentAndAppointment, verifyPaymentAndCheckup } = require("../controllers/appointment/confirmPaymentAndAppointment.js")
const {uploadDocument, getDocumentsByAppointment, getDocumentById, updateDocument, deleteDocument,} = require("../controllers/appointment/uploadHealthDocument.js")
const upload = require("../controllers/savingSpaces/connectCloudDb.js")



const router = express.Router();

router.post("/create-appointment", protect, scheduleAppointment);
router.delete("/delete-appointment", protect, deleteAppointment);
// router.put("/update-appointment", protect, updateAppointment);
router.get("/list-appointments", protect, showAllAppointments);
router.put("/doctor-update-appointment", protect, appointmentUpdateByDoctor)
router.post("/schedule-checkup-appointment", protect, scheduleCheckup)
router.put("/confirm-appointment", protect, verifyPaymentAndAppointment)
router.put("/confirm-checkup", protect, verifyPaymentAndCheckup)
router.post("/upload-appointment-document", protect, upload.single("document"), uploadDocument)
router.get("/get-document-for/:appointment_id", protect, getDocumentsByAppointment);
router.get("/get-document/:id", protect, getDocumentById);
router.put("/replace-document/:id", protect, upload.single("document"), updateDocument);
router.delete("/delete-document/:id", protect, deleteDocument);


module.exports = router;