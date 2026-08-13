const {
    appointments,
    doctorProfile,
    doctorSlots,
    payments,
    User
} = require("../../../models");
const logger = require("../../../logger");
const checkSlotAvailability = require("../slots/checkSlots");
const checkAnotherAppointment = require("../slots/checkAppointmentAvailability");
const { createOrder } = require("../payment/paymentController");

const scheduleAppointment = async (req, res) => {
    try {
        const {
            date,
            start,
            end,
            type,
            payment_mode
        } = req.body

        const doctorObj = await doctorProfile.findOne({
            where: {
                user_id: req.body.doctor_id
            }
        })

        if (!doctorObj || doctorObj.kyc_status !== "verified") {
            return res.status(400).json({
                message: "Doctor not eligible for payments"
            });
        }

        const doctor_id = doctorObj.user_id

        if (payment_mode === "cash" && type.includes("online")) {
            return res.status(400).json({
                error: "online appointment cant have offline payment"
            })
        }

        if (!['online_video', 'online_audio', 'offline'].includes(type)) {
            return res.status(400).json({
                error: "appointment type is not valid"
            })
        }

        if (!["cash", "card", "bank_transfer", "mobile_banking"].includes(payment_mode)) {
            return res.status(400).json({
                error: "cant find relevant value in payment mode"
            })
        }

        // Step 1: Check if the slot is in the doctor's available slots
        const isAvailable = await checkSlotAvailability(doctor_id, start, end, date, type);
        if (!isAvailable) {
            return res.status(404).json({
                message: "Slot is not available in doctor's schedule."
            })
        }

        // Step 2: Check if the doctor already has an appointment at that exact slot
        const isBooked = await checkAnotherAppointment(doctor_id, date, start, end);
        if (isBooked) {
            throw new Error("Doctor already has an appointment at this slot.");
        }


        const doctorUserObj = await User.findByPk(doctorObj.user_id)
        const userObj = await User.findByPk(req.user.payload.id)


        const createdAppointment = await appointments.create({
            user_id: req.user.payload.id,
            doctor_id: req.body.doctor_id,
            appointment_date: date,
            appointment_start_time: start,
            appointment_end_time: end,
            appointment_status: payment_mode === "cash" ? "confirmed" : "pending",
            payment_mode,
            appointment_type: type,
            belongs_to_hospital: doctorObj.organisation_id !== null,
            hospital_id: doctorObj.organisation_id
        });

        const notes = {
            patientName: userObj.userName,
            patientEmail: userObj.email,
            doctorName: doctorUserObj.userName,
            appointmentDate: createdAppointment.appointment_date,
            appointmentTime: `${createdAppointment.appointment_start_time}-${createdAppointment.appointment_end_time}`,
            appointmentId: createdAppointment.id,
        }

        await createOrder(doctorObj.consultation_fee, createdAppointment.id, req.body.doctor_id, notes, payment_mode, doctorObj.organisation_id);

        // const createPayment = await payments.create({
        //     user_id: req.user.payload.id,
        //     appointment_id: createdAppointment.id,
        //     checkup_id: null,
        //     payment_status: "pending",
        //     payment_date: new Date(),
        //     payment_amount: doctorObj.consultation_fee,
        //     payment_method: payment_mode,
        //     organisation_id: doctorObj.organisation_id,
        //     payment_notes: JSON.stringify(notes)
        // })

        // Step 4: Remove the booked slot from doctorSlots
        let slotRecord = await doctorSlots.findOne({
            where: {
                doctor_id
            }
        });
        if (slotRecord && !Array.isArray(slotRecord.slots)) {
            let slotsData = [];

            try {
                let raw = slotRecord.slots;

                // Handle Sequelize returning Buffer for TEXT fields in some setups
                if (Buffer.isBuffer(raw)) {
                    raw = raw.toString();
                }

                // If it's a string (most common case), parse it
                if (typeof raw === "string") {
                    slotsData = JSON.parse(raw);

                    // Handle rare double-encoded JSON
                    if (typeof slotsData === "string") {
                        slotsData = JSON.parse(slotsData);
                    }
                } else if (Array.isArray(raw)) {
                    // Already parsed
                    slotsData = raw;
                } else {
                    slotsData = [];
                }
                slotRecord.slots = slotsData
            } catch (err) {
                console.error("[Error] Failed to parse slots JSON:", err);
                slotsData = [];
            }

        }
        if (slotRecord && Array.isArray(slotRecord.slots)) {
            let slots;
            if (typeof slotRecord.slots === "string") {
                slots = JSON.parse(slotRecord.slots);
            } else {
                slots = slotRecord.slots
            }
            const updatedSlots = [...slots]; // deep copy
            const dateIndex = updatedSlots.findIndex(s => {
                return s.date === date
            });
            if (dateIndex !== -1) {
                const daySlots = updatedSlots[dateIndex].slots || [];
                // Remove the slot that matches {start, end}
                const filteredDaySlots = daySlots.filter(slot => !(slot.start === start && slot.end === end));
                updatedSlots[dateIndex].slots = filteredDaySlots;

                await doctorSlots.update({
                    slots: updatedSlots
                }, {
                    where: {
                        doctor_id
                    }
                });
            }
        }


        return res.status(200).json({
            message: "appointment scheduled",
            createdAppointment,
            success: true
        })
    } catch (Error) {
        return res.status(400).json({
            error: Error.message
        })
    }

}

module.exports = scheduleAppointment