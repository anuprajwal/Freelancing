const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment/paymentController');

router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

router.get('/payment/:paymentId', paymentController.getPaymentDetails);
router.post('/refund', paymentController.refundPayment);
router.get('/status/:orderId', paymentController.getPaymentStatus);

module.exports = router;
//aer