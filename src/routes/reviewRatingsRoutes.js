const express = require("express");
const  doctorReviewRatings  = require("../controllers/reviewRatings/doctorReviewRatings.js");
const getReviewsByAppointment = require("../controllers/reviewRatings/getReviewByAppointment.js")
const getReviewsByDoctor = require("../controllers/reviewRatings/getReviewByDoctor.js")

const  protect  = require("../middlewares/authMiddleware.js");
const checkAccountStatus = require("../middlewares/accountCheck.js")

const router = express.Router();

router.post("/doctor-review-ratings", protect, checkAccountStatus, doctorReviewRatings);
router.get("/get-appointment-rating/:appointment_id", protect, checkAccountStatus, getReviewsByAppointment)
router.get("/get-doctor-rating/:doctor_id", getReviewsByDoctor)

module.exports = router;


