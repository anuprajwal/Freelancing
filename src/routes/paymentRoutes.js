const express = require("express");
const router = express.Router();
const { verifyPayment, handleWebhook , getPaymentStatus, createOrder, getPaymentDetails, refundPayment } = require("../controllers/payment/paymentController");
const bodyParser = require("body-parser");
const protect = require("../middlewares/authMiddleware")
const checkAccountStatus = require("../middlewares/accountCheck.js")

// Create Razorpay Order (with split logic handled in controller)
router.post('/payment/create-order', protect, checkAccountStatus, createOrder);

// Verify Payment Signature
router.post('/verify-payment', protect, checkAccountStatus, verifyPayment);

// Razorpay Webhook (raw body required for signature verification)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Fetch Payment Details
router.get('/payment/:paymentId', protect, checkAccountStatus, getPaymentDetails);

// Refund Payment
router.post('/refund', protect, checkAccountStatus, refundPayment);

// Fetch Payment Status by Order ID
router.get('/status/:orderId', protect, checkAccountStatus, getPaymentStatus);

router.post("/payment/verify", protect, checkAccountStatus, verifyPayment);

router.post(
  "/payment/webhook",
 protect,  checkAccountStatus,   bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
      next();
    } catch (err) {
      res.status(400).send("Invalid JSON");
    }
  },
  handleWebhook
);

router.get("/payment/status/:orderId", protect, checkAccountStatus, getPaymentStatus);
module.exports = router;
