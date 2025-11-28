const Razorpay = require('razorpay');
const crypto = require('crypto');
const { payments, appointments, User, doctorProfile } = require('../../../models');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order with dynamic doctor/company split
async function createOrder(req, res) {
  try {
    const {
      amount,
      appointmentId,
      patientName,
      patientEmail,
      patientPhone,
      doctorId,
      appointmentDate,
      appointmentTime
    } = req.body;

    if (!amount || !appointmentId || !patientEmail || !doctorId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const doctor = await doctorProfile.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    if (doctor.kyc_status !== "verified") {
      return res.status(400).json({ success: false, message: 'Doctor KYC not verified' });
    }

    // Split logic based on joining date
    const joinedAt = doctor.joined_at;
    const now = new Date();
    const diffMonths = (now.getFullYear() - joinedAt.getFullYear()) * 12 + (now.getMonth() - joinedAt.getMonth());

    const companyShare = diffMonths < 2 ? 0.10 : 0.30;
    const doctorShare = 1 - companyShare;

    const doctorAmount = Math.round(amount * doctorShare * 100);
    const companyAmount = Math.round(amount * companyShare * 100);

    // Razorpay order with transfers
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${appointmentId}`,
      notes: { appointmentId, patientName, patientEmail, doctorId, appointmentDate, appointmentTime },
      transfers: [
        {
          account: doctor.rzp_account_id,
          amount: doctorAmount,
          currency: "INR",
          on_hold: false,
          fee_bearer: "recipient",
          notes: { doctorId, appointmentId }
        },
        {
          account: process.env.COMPANY_RZP_ACCOUNT_ID,
          amount: companyAmount,
          currency: "INR",
          on_hold: false,
          notes: { appointmentId }
        }
      ]
    });

    await payments.create({
      user_id: req.user?.id || null,
      appointment_id: appointmentId,
      payment_status: 'pending',
      payment_date: new Date(),
      payment_amount: amount,
      doctor_amount: doctorAmount / 100,
      company_amount: companyAmount / 100,
      payment_method: 'card',
      transaction_id: order.id,
      payment_notes: JSON.stringify({ patientName, patientEmail, doctorId, appointmentDate, appointmentTime }),
    });

    res.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
}

// Verify Payment Signature
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const paymentRecord = await payments.findOne({ where: { transaction_id: razorpay_order_id } });
    if (!paymentRecord) return res.status(404).json({ success: false, message: 'Payment record not found' });

    await paymentRecord.update({
      payment_status: 'paid',
      payment_method: 'card',
      transaction_id: razorpay_payment_id,
      payment_date: new Date(),
    });

    const appointment = await appointments.findByPk(paymentRecord.appointment_id);
    if (appointment) await appointment.update({ status: 'confirmed', paymentStatus: 'paid' });

    res.json({ success: true, message: 'Payment verified successfully', appointmentId: paymentRecord.appointment_id });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
}

// Get Payment Details
async function getPaymentDetails(req, res) {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment details' });
  }
}

// Refund Payment
async function refundPayment(req, res) {
  try {
    const { paymentId, amount } = req.body;
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    res.json({ success: true, refund });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ success: false, message: 'Refund failed' });
  }
}

// Get Payment Status
async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;
    const order = await razorpay.orders.fetch(orderId);

    res.json({ success: true, status: order.status, order });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ success: false, message: 'Failed to get status' });
  }
}

// Handle Razorpay Webhook
async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = body.event;
    const payload = body.payload;

    switch (event) {
      case 'payment.captured':
        const paymentId = payload.payment.entity.id;
        const paymentRecord = await payments.findOne({ where: { transaction_id: paymentId } });
        if (paymentRecord) await paymentRecord.update({ payment_status: 'paid' });
        break;

      case 'transfer.processed':
        const transferId = payload.transfer.entity.id;
        const orderId = payload.transfer.entity.order_id;
        const paymentRecord2 = await payments.findOne({ where: { transaction_id: orderId } });
        if (paymentRecord2) await paymentRecord2.update({ rzp_transfer_id: transferId });
        break;

      case 'transfer.failed':
        console.log('Transfer failed for order:', payload.transfer.entity.order_id);
        break;

      default:
        console.log('Unhandled Webhook Event:', event);
    }

    res.status(200).json({ success: true, message: 'Webhook handled' });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
  getPaymentStatus,
  handleWebhook
};
