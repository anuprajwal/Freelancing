const crypto = require("crypto");

module.exports = (req, res, next) => {
  const webhookSecret = process.env.RZP_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  next();
};
