const express = require("express");
const router = express.Router();

const doctorKycController = require("../controllers/payment/doctorKycController");

router.post("/doctor/:id/start-onboarding", doctorKycController.startOnboarding);
router.get("/doctor/:id/onboarding-status", doctorKycController.getOnboardingStatus);

module.exports = router;
