const express = require("express");
const scheduleAppointment = require("../controllers/appointment/createAppointment.js");
const deleteAppointment = require("../controllers/appointment/deleteAppointment.js");
const showAllAppointments = require("../controllers/appointment/showAllAppointments.js");
const protect = require("../middlewares/authMiddleware.js");
const checkAccountStatus = require("../middlewares/accountCheck.js")
const showTodayAppointments = require("../controllers/appointment/getTodayAppointment.js")
const showNextAppointment = require("../controllers/appointment/getNextAppointment.js")




const {
    appointmentUpdateByDoctor,
    getPrescription
} = require("../controllers/appointment/doctorUpdateAppointments.js");
const scheduleCheckup = require("../controllers/appointment/sceduleCheckup.js");
const showSingleAppointment = require("../controllers/appointment/getAppointmentData")
const {
    verifyPaymentAndAppointment,
    verifyPaymentAndCheckup
} = require("../controllers/appointment/confirmPaymentAndAppointment.js")
const {
    uploadDocument,
    getDocumentsByAppointment,
    getDocumentById,
    updateDocument,
    deleteDocument,
} = require("../controllers/appointment/uploadHealthDocument.js")
const upload = require("../controllers/savingSpaces/connectCloudDb.js")
const showUpcomingAppointments = require("../controllers/appointment/showUpcomingAppointments.js");




const router = express.Router();

router.post("/create-appointment", protect, checkAccountStatus, scheduleAppointment);
router.delete("/delete-appointment", protect, checkAccountStatus, deleteAppointment);
router.get("/list-appointments", protect, checkAccountStatus, showAllAppointments);
router.get("/get-single-appointment", protect, checkAccountStatus, showSingleAppointment);
router.get("/today", protect, checkAccountStatus, showTodayAppointments);
router.get("/next", protect, checkAccountStatus, showNextAppointment);
router.get("/upcoming", protect, checkAccountStatus, showUpcomingAppointments);

router.put("/doctor-update-appointment", protect, checkAccountStatus, appointmentUpdateByDoctor)
router.get("/get-prescription-for/:appointment_id", protect, checkAccountStatus, getPrescription)

router.post("/schedule-checkup-appointment", protect, checkAccountStatus, scheduleCheckup)
router.put("/confirm-checkup", protect, checkAccountStatus, verifyPaymentAndCheckup)

router.post("/upload-appointment-document", protect, checkAccountStatus, upload.single("document"), uploadDocument)
router.get("/get-document-for/:appointment_id", protect, checkAccountStatus, getDocumentsByAppointment);
router.get("/get-document/:id", protect, checkAccountStatus, getDocumentById);
router.put("/replace-document/:id", protect, checkAccountStatus, upload.single("document"), updateDocument);
router.delete("/delete-document/:id", protect, checkAccountStatus, deleteDocument);


module.exports = router;