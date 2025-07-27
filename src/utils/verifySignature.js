// verifying payment signature 
const crypto = require("crypto");

function verifyRazorpaySignature(order_id, payment_id, signature, secret) {
  const generated = crypto
    .createHmac("sha256", secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  return generated === signature;
}

module.exports = verifyRazorpaySignature;
