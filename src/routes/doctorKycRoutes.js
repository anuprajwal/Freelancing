const express = require("express");
const router = express.Router();

const doctorKycController = require("../controllers/payment/doctorKycController");
const hospitalKycController = require("../controllers/payment/hospitalKycController");
const protect = require("../middlewares/authMiddleware.js");


router.post("/doctor/:id/start-onboarding", protect, doctorKycController.startOnboarding);
router.get("/doctor/:id/onboarding-status", protect, doctorKycController.getOnboardingStatus);
router.post("/hospital/:id/start-onboarding", protect, hospitalKycController.startOnboardingHospital);
router.get("/hospital/:id/onboarding-status", protect, hospitalKycController.getOnboardingStatus);

module.exports = router;
