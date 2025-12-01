const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/payment/webhookController');

// Use express.raw here to get rawBuffer for signature verification
router.post('/razorpay/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

module.exports = router;
