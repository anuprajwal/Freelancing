const express = require("express");
const  scheduleAppointment  = require("../controllers/appointment/createAppointment.js");
const  deleteAppointment  = require("../controllers/appointment/deleteAppointment.js");
const  showAllAppointments  = require("../controllers/appointment/showAllAppointments.js");
const  protect  = require("../middlewares/authMiddleware.js");
const checkAccountStatus = require("../middlewares/accountCheck.js")
const {appointmentUpdateByDoctor, getPrescription} = require("../controllers/appointment/doctorUpdateAppointments.js");
const scheduleCheckup = require("../controllers/appointment/sceduleCheckup.js");
const { verifyPaymentAndAppointment, verifyPaymentAndCheckup } = require("../controllers/appointment/confirmPaymentAndAppointment.js")
const {uploadDocument, getDocumentsByAppointment, getDocumentById, updateDocument, deleteDocument,} = require("../controllers/appointment/uploadHealthDocument.js")
const upload = require("../controllers/savingSpaces/connectCloudDb.js")



const router = express.Router();

router.post("/create-appointment", checkAccountStatus, protect, scheduleAppointment);
router.delete("/delete-appointment", checkAccountStatus, protect, deleteAppointment);
router.get("/list-appointments", checkAccountStatus, protect, showAllAppointments);

router.put("/doctor-update-appointment", checkAccountStatus, protect, appointmentUpdateByDoctor)
router.get("/get-prescription-for/:appointment_id", checkAccountStatus, protect, getPrescription)

router.post("/schedule-checkup-appointment", checkAccountStatus, protect, scheduleCheckup)
router.put("/confirm-appointment", checkAccountStatus, protect, verifyPaymentAndAppointment)
router.put("/confirm-checkup", checkAccountStatus, protect, verifyPaymentAndCheckup)

router.post("/upload-appointment-document", checkAccountStatus, protect, upload.single("document"), uploadDocument)
router.get("/get-document-for/:appointment_id", checkAccountStatus, protect, getDocumentsByAppointment);
router.get("/get-document/:id", checkAccountStatus, protect, getDocumentById);
router.put("/replace-document/:id", checkAccountStatus, protect, upload.single("document"), updateDocument);
router.delete("/delete-document/:id", checkAccountStatus, protect, deleteDocument);


module.exports = router;