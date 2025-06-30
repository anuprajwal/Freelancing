const express = require("express");
const  doctorReviewRatings  = require("../controllers/reviewRatings/doctorReviewRatings.js");
const  protect  = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/doctor-review-ratings", protect, doctorReviewRatings);

module.exports = router;


