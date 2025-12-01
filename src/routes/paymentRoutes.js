const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const protect = require("../middlewares/authMiddleware");
const checkAccountStatus = require("../middlewares/accountCheck.js");

const paymentController = require("../controllers/payment/paymentController");

// Create Razorpay Order (with split logic)
router.post("/payment/create-order", protect, checkAccountStatus, paymentController.createOrder);

// Verify Payment
router.post("/verify-payment", protect, checkAccountStatus, paymentController.verifyPayment);

// Get Payment Details
router.get("/payment/:paymentId", protect, checkAccountStatus, paymentController.getPaymentDetails);

// Refund Payment
router.post("/refund", protect, checkAccountStatus, paymentController.refundPayment);

// Get Order Status
router.get("/status/:orderId", protect, checkAccountStatus, paymentController.getPaymentStatus);

// Webhook: expose raw body route (no protect middleware) — Razorpay calls this publicly
// Make sure your app registers this route BEFORE any body-parser json middleware that consumes body
router.post("/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  // attach rawBody for handler to verify signature
  req.rawBody = JSON.parse(req.body.toString("utf8"));
  req.body = req.rawBody;
  next();
}, paymentController.handleWebhook);

module.exports = router;
