const express = require("express");
const router = express.Router();
const upload = require("../middlewares/fileUpload.js");
const verifyWebhook = require("../middlewares/verifyRzpWebhook.js");
const doctorKycController = require("../controllers/payment/doctorKycController");

// Create Linked Account (protected)
router.post("/doctor/:id/create-linked-account", doctorKycController.createLinkedAccount);

// Upload KYC document (protected)
router.post("/doctor/:id/upload-kyc", upload.single("document"), doctorKycController.uploadKycDocument);

// Razorpay KYC webhook (public endpoint)
router.post("/razorpay/kyc-webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  try {
    req.rawBody = JSON.parse(req.body.toString("utf8"));
    req.body = req.rawBody;
    next();
  } catch (err) {
    return res.status(400).send("Invalid JSON");
  }
}, doctorKycController.razorpayWebhook /* optional: implement same handler inside controller if needed */);

module.exports = router;
