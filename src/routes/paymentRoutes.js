const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment/paymentController');

// Create Razorpay Order (with split logic handled in controller)
router.post('/create-order', paymentController.createOrder);

// Verify Payment Signature
router.post('/verify-payment', paymentController.verifyPayment);

// Razorpay Webhook (raw body required for signature verification)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Fetch Payment Details
router.get('/payment/:paymentId', paymentController.getPaymentDetails);

// Refund Payment
router.post('/refund', paymentController.refundPayment);

// Fetch Payment Status by Order ID
router.get('/status/:orderId', paymentController.getPaymentStatus);

module.exports = router;
