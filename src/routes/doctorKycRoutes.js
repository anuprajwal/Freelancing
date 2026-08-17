const express = require("express");
const router = express.Router();

const doctorKycController = require("../controllers/payment/doctorKycController");
const hospitalKycController = require("../controllers/payment/hospitalKycController");

router.post("/doctor/:id/start-onboarding", doctorKycController.startOnboarding);
router.get("/doctor/:id/onboarding-status", doctorKycController.getOnboardingStatus);
router.post("/hospital/:id/start-onboarding", hospitalKycController.startOnboardingDoctor);
router.get("/hospital/:id/onboarding-status", hospitalKycController.getOnboardingStatus);

module.exports = router;
