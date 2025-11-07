const { payments, appointments } = require("../../models");

const createPaymentRecord = async ({ user_id, appointment_id, amount, order_id, notes }) => {
  return await payments.create({
    user_id,
    appointment_id,
    payment_status: "pending",
    payment_date: new Date(),
    payment_amount: amount,
    payment_method: "card",
    transaction_id: order_id,
    payment_notes: JSON.stringify(notes),
  });
};

const updatePaymentSuccess = async (order_id, payment_id) => {
  const record = await payments.findOne({ where: { transaction_id: order_id } });
  if (record) {
    await record.update({
      payment_status: "paid",
      transaction_id: payment_id,
      payment_date: new Date(),
    });

    const AppointmentRecord = await appointments.findOne({ where: { id: record.appointment_id } });
    if (!AppointmentRecord) {
      return res.status(400).json({ error: "Appointment not found" });
    }
    await AppointmentRecord.update({ appointment_status: "confirmed" });
  }
};


module.exports = { createPaymentRecord, updatePaymentSuccess };
