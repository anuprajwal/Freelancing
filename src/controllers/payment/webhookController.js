const crypto = require('crypto');
const { webhookEvent, payments, transfer, settlement, doctorProfile } = require('../../../models'); // adjust path

exports.handleWebhook = async (req, res) => {
  try {
    // req.body must be raw bytes via express.raw middleware on route
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing RAZORPAY_WEBHOOK_SECRET env var');
      return res.status(500).send('Webhook secret not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer (because express.raw used)
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (expected !== signature) {
      console.warn('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Parse JSON once (safe because signature passed)
    const bodyJson = JSON.parse(rawBody.toString('utf8'));
    const event = bodyJson.event;
    // Persist raw webhook for audit (idempotent by event id + created_at)
    let eventId = null;
    try {
      // event id may be nested; try to pick a stable id
      eventId = bodyJson.payload?.payment?.entity?.id || bodyJson.payload?.transfer?.entity?.id || bodyJson.payload?.account?.entity?.id || null;
    } catch (e) {
      eventId = null;
    }

    // Save webhook event record (if not already)
    const savedWebhook = await webhookEvent.create({
      event_id: eventId,
      event_type: event,
      raw_body: bodyJson,
      headers: req.headers,
      processed: false,
    });

    // Handler switch (idempotent checks included)
    switch (event) {
      // -------- Payment events --------
      case 'payment.captured': {
        const paymentEntity = bodyJson.payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;

        // Find payment record by transaction_id (which you saved as order.id)
        const paymentRecord = await payments.findOne({ where: { transaction_id: orderId } });
        if (paymentRecord && paymentRecord.payment_status !== 'paid') {
          await paymentRecord.update({
            payment_status: 'paid',
            transaction_id: razorpayPaymentId,
            payment_method: paymentEntity.method || paymentRecord.payment_method,
            payment_date: new Date(),
          });
          // update appointment status
          const appointment = await require('../../models').appointments.findByPk(paymentRecord.appointment_id);
          if (appointment) await appointment.update({ status: 'confirmed', paymentStatus: 'paid' });
        }
        break;
      }

      // -------- Transfer events --------
      case 'transfer.processed':
      case 'transfer.paid':
      case 'transfer.failed': {
        const transferEntity = bodyJson.payload.transfer.entity;
        const rzpTransferId = transferEntity.id;
        const orderId = transferEntity.order_id; // the order id
        const status = transferEntity.status; // processed/paid/failed

        // Find local transfer row: match by order_id AND amount AND (doctor_id via notes)
        // Use razorpay transfer id if present, else match by (order_id + amount + account)
        let localTransfer = await transfer.findOne({ where: { razorpay_transfer_id: rzpTransferId } });
        if (!localTransfer) {
          // fallback: try to find by order_id + amount
          localTransfer = await transfer.findOne({
            where: {
              order_id: orderId,
              amount: transferEntity.amount,
            },
          });
        }

        // If no local transfer, create one
        if (!localTransfer) {
          localTransfer = await transfer.create({
            razorpay_transfer_id: rzpTransferId,
            order_id: orderId,
            payment_id: transferEntity.payment_id || null,
            appointment_id: transferEntity.notes?.appointmentId || null,
            doctor_id: transferEntity.notes?.doctorId || null,
            amount: transferEntity.amount,
            currency: transferEntity.currency,
            status,
            raw_payload: transferEntity,
          });
        } else {
          // idempotent update
          await localTransfer.update({
            razorpay_transfer_id: rzpTransferId,
            status,
            raw_payload: transferEntity,
          });
        }

        // If transfer succeeded, create/update settlement record
        if (status === 'paid' || status === 'processed') {
          await settlement.create({
            transfer_id: localTransfer.id,
            razorpay_transfer_id: rzpTransferId,
            doctor_id: localTransfer.doctor_id,
            amount: localTransfer.amount,
            currency: localTransfer.currency,
            status: status === 'paid' ? 'paid' : 'processed',
            settled_at: status === 'paid' ? new Date() : null,
            extra: transferEntity,
          });
        }

        // If failed, log - you may notify admins here
        if (status === 'failed') {
          console.error('Transfer failed for order:', orderId, 'transfer:', rzpTransferId);
        }
        break;
      }

      // -------- KYC/Account events --------
      case 'account.kyc.verified':
      case 'account.kyc.rejected': {
        const accountEntity = bodyJson.payload.account.entity;
        // accountEntity.id contains rzp_account_id
        const rzpAccountId = accountEntity.id;
        const doctor = await doctorProfile.findOne({ where: { rzp_account_id: rzpAccountId } });
        if (doctor) {
          const newStatus = event === 'account.kyc.verified' ? 'verified' : 'rejected';
          await doctor.update({ kyc_status: newStatus });
        }
        break;
      }

      // -------- Refund and other events (recommended) --------
      case 'refund.processed':
      case 'payment.failed':
      case 'payment.authorized':
      default:
        console.log('Unhandled event (logged):', event);
        break;
    }

    // mark webhook as processed
    await savedWebhook.update({ processed: true, processed_at: new Date() });

    // ALWAYS respond 200 quickly
    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook processing failed:', err);
    return res.status(500).send('webhook processing failed');
  }
};
