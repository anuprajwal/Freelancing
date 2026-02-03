// routes/webhookRoutes.js
const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/payment/webhookController");

router.post(
  "/razorpay/webhook",
  express.raw({ type: "application/json" }),
  webhookController.handleWebhook
);

module.exports = router;
