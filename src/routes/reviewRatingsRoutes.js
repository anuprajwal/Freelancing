const express = require("express");
const  doctorReviewRatings  = require("../controllers/reviewRatings/doctorReviewRatings.js");
const getReviewsByAppointment = require("../controllers/reviewRatings/getReviewByAppointment.js")
const getReviewsByDoctor = require("../controllers/reviewRatings/getReviewByDoctor.js")

const  protect  = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/doctor-review-ratings", protect, doctorReviewRatings);
router.get("/get-appointment-rating/:appointment_id", protect, getReviewsByAppointment)
router.get("/get-doctor-rating/:doctor_id", getReviewsByDoctor)

module.exports = router;


