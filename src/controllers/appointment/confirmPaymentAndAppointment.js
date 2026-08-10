const razorpay = require("../../utils/razorpay");
const {payments, appointments, checkupAppointment} = require("../../../models")

const verifyPaymentAndAppointment = async (req, res) => {
    const { appointmentId, razorpay_order_id } = req.body;

    const payment_data = await payments.findOne({
        where: {
            transaction_id: razorpay_order_id
        }
    });

    if (!payment_data) {
        return res.status(404).json({
            error: "Payment record not found"
        });
    }

    const { payment_status } = payment_data;

    if (payment_status !== "paid") {
        return res.status(400).json({
            error: "Payment is not yet paid",
            payment: payment_data
        });
    }

    await appointments.update(
        { appointment_status: "confirmed" },
        {
            where: {
                id: appointmentId
            }
        }
    );

    return res.status(200).json({
        message: "Your appointment is confirmed"
    });
};




const verifyPaymentAndCheckup = async (req, res)=>{
    const {checkupId} = req.body
    const user_id = req.user.payload.id

    const payment_data = await payments.findOne({
        where:{
            checkup_id: checkupId,
            user_id
        }
    })

    const {payment_status} = payment_data
    
    if (payment_status !== "paid"){
        return res.status(400).json({error:"payment is not yet paid"})
    }

    await checkupAppointment.update(
        {checkup_status: "confirmed"},
        {
            where: {
                id:checkupId
            }
        }
    )

    return res.status(200).json({message:"your checkup appointment is confirmed"})
}


module.exports = {
    verifyPaymentAndAppointment,
    verifyPaymentAndCheckup
}