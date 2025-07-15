const Razorpay = require('razorpay');
const crypto = require('crypto');
const { payments, appointments, User } = require('../../../models');
const { log } = require('console');
// const { sendPaymentConfirmationEmail } = require('../../utils/emailService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
const createOrder = async (req, res) =>{
  try {
    const {
      user_id,
      amount,
      appointmentId,
      patientName,
      patientEmail,
      patientPhone,
      doctorName,
      appointmentDate,
      appointmentTime
    } = req.body;


    console.log('wc',amount, appointmentId, patientEmail , user_id)

    if (!amount || !appointmentId || !patientEmail || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields heerer',
      });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${appointmentId}`,
      notes: {
        appointmentId,
        patientName,
        patientEmail,
        doctorName,
        appointmentDate,
        appointmentTime
      }
    };

   
    const order = await razorpay.orders.create(options);

    await payments.create({
      user_id: req.body.user_id,
      appointment_id: appointmentId,
      payment_status: 'pending',
      payment_date: new Date(),
      payment_amount: amount,
      payment_method: 'card',
      transaction_id: order.id,
      payment_notes: JSON.stringify(options.notes),
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
}

// Verify Payment Signature
async function verifyPayment(req, res) {
  
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    console.log(expectedSignature);
    console.log(razorpay_signature);
    
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const paymentRecord = await payments.findOne({ where: { transaction_id: razorpay_order_id } });
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    await paymentRecord.update({
      payment_status: 'paid',
      payment_method: 'card',
      transaction_id: razorpay_payment_id,
      payment_date: new Date(),
    });

    const appointment = await appointments.findByPk(paymentRecord.appointment_id);
    if (appointment) {
      await appointment.update({ status: 'confirmed', paymentStatus: 'paid' });
    }

  //   await sendPaymentConfirmationEmail({
  //     patientEmail: JSON.parse(paymentRecord.payment_notes)?.patientEmail,
  //     patientName: JSON.parse(paymentRecord.payment_notes)?.patientName,
  //     doctorName: JSON.parse(paymentRecord.payment_notes)?.doctorName,
  //     appointmentDate: JSON.parse(paymentRecord.payment_notes)?.appointmentDate,
  //     appointmentTime: JSON.parse(paymentRecord.payment_notes)?.appointmentTime,
  //     amount: paymentRecord.payment_amount,
  //     paymentId: razorpay_payment_id,
  //   });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      appointmentId: paymentRecord.appointment_id
    });

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

    res.json({
      success: true,
      payment,
    });
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
    res.json({
      success: true,
      status: order.status,
      order,
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ success: false, message: 'Failed to get status' });
  }
}

// Handle Razorpay Webhook
function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = body.event;
    const payload = body.payload;

    switch (event) {
      case 'payment.captured':
        console.log('Payment Captured:', payload.payment.entity.id);
        break;
      case 'payment.failed':
        console.log('Payment Failed:', payload.payment.entity.id);
        break;
      case 'order.paid':
        console.log('Order Paid:', payload.order.entity.id);
        break;
      case 'refund.created':
        console.log('Refund Created:', payload.refund.entity.id);
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
