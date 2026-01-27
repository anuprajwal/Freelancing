const express = require("express");
const router = express.Router();

const upload = require("../middlewares/fileUpload.js");
const verifyWebhook = require("../middlewares/verifyRzpWebhook.js");

const doctorKycController = require("../controllers/payment/doctorKycController");
const {
    handleWebhook
} = require("../controllers/payment/webhookController.js"); // <-- correct name

// Create Linked Account
router.post("/doctor/:id/create-linked-account", doctorKycController.createLinkedAccountController);

// Upload KYC Document
router.post("/doctor/:id/upload-kyc", upload.single("document"), doctorKycController.uploadKycDocument);

// Razorpay KYC Webhook (public)
router.post(
    "/razorpay/kyc-webhook",
    express.raw({
        type: "application/json"
    }), // required for signature verification
    verifyWebhook, // signature check middleware
    handleWebhook // <-- use the correct exported function
);

module.exports = router;