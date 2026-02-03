const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const paymentController = require("../controllers/payment/paymentController");

router.post("/order", protect, paymentController.createOrder);
router.post("/verify", protect, paymentController.verifyPayment);
router.post("/refund", protect, paymentController.refundPayment);
router.get("/status/:orderId", protect, paymentController.getPaymentStatus);
router.get("/details/:paymentId", protect, paymentController.getPaymentDetails);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

module.exports = router;

