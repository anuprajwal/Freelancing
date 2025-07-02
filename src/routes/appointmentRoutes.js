const express = require("express");
const  scheduleAppointment  = require("../controllers/appointment/createAppointment.js");
const  deleteAppointment  = require("../controllers/appointment/deleteAppointment.js");
const  updateAppointment  = require("../controllers/appointment/updateAppointment.js");
const  rescheduleRequest  = require("../controllers/appointment/rescheduleRequest.js");
const  showAllAppointments  = require("../controllers/appointment/showAllAppointments.js");
const  removeRescheduled  = require("../controllers/appointment/removeRescheduled.js");
const {getSortedDoctors} = require("../middlewares/getSortedDoctors.js");
const  protect  = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/create-appointment", protect, scheduleAppointment);
router.delete("/delete-appointment", protect, deleteAppointment);
router.put("/update-appointment", protect, updateAppointment);
router.put("/reschedule-appointment", protect, rescheduleRequest);
router.get("/list-appointments", protect, showAllAppointments);
router.delete("/remove-rescheduled", protect, removeRescheduled);
router.get("/get-sorted-doctors", protect, getSortedDoctors);



module.exports = router;