const express = require("express");
const router = express.Router();

const upload = require("../middlewares/fileUpload.js");
const verifyWebhook = require("../middlewares/verifyRzpWebhook.js");

const {
  createLinkedAccount,
  uploadKycDocument,
  razorpayWebhook,
} = require("../controllers/payment/doctorKycController.js");

// Create Linked Account
router.post("/doctor/:id/create-linked-account", createLinkedAccount);

// Upload KYC Document
router.post(
  "/doctor/:id/upload-kyc",
  upload.single("document"),
  uploadKycDocument
);

// Razorpay KYC Webhook
router.post("/razorpay/kyc-webhook", verifyWebhook, razorpayWebhook);

module.exports = router;
