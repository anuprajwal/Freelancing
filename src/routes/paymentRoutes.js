const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, handleWebhook , getPaymentStatus } = require("../controllers/paymentController");
const bodyParser = require("body-parser");

router.post("/payment/create-order", createOrder);
router.post("/payment/verify", verifyPayment);

router.post(
  "/payment/webhook",
  bodyParser.raw({ type: "application/json" }),
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

router.get("/payment/status/:orderId", getPaymentStatus);
module.exports = router;

