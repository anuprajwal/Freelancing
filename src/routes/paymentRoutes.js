const express = require("express");
const router = express.Router();
const { verifyPayment, handleWebhook , getPaymentStatus } = require("../controllers/payment/paymentController");
const bodyParser = require("body-parser");
const protect = require("../middlewares/authMiddleware")
const checkAccountStatus = require("../middlewares/accountCheck.js")

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

