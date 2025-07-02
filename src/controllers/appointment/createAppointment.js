const { appointments, User, doctorProfile } = require("../../../models");
const { Op } = require("sequelize");
const logger = require("../../../logger");

const scheduleAppointment = async (req, res) => {
  try {
    const { payload } = req.user;
    const { id } = payload;

    logger.info(`Request received to schedule new appointment from user: ${id}`);

    const { doctor_id, appointment_date, appointment_time, appointment_type } = req.body;

   
    if (!doctor_id || !appointment_date || !appointment_time || !appointment_type) {
      logger.warning(`Request made by user: ${id} has missing fields`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate date and time formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(appointment_date)) {
      logger.warning(`Date format in request made by user: ${id}, is invalid`);
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    
    if (!timeRegex.test(appointment_time)) {
      logger.warning(`Time format in request made by user: ${id}, is invalid`);
      return res.status(400).json({ error: "Invalid time format. Use HH:MM" });
    }

    const user = await User.findByPk(id);
    
    const { doctor, appointmentTimeFormatted } = req.doctorAvailabilityData;
    const doctorUser = await User.findByPk(doctor?.user_id);

    if (user.role !== "general_user") {
      logger.warning(`User requesting to create appointment is recognized as doctor`);
      return res.status(403).json({ error: "Only patients can schedule appointments" });
    }

    if (user.email === doctorUser.email) {
      logger.warning(`User is recognized as patient scheduling to his own account`);
      return res.status(400).json({ error: "You cannot schedule an appointment with yourself" });
    }

    if (!["online_video", "online_audio", "offline"].includes(appointment_type)) {
      logger.warning(`Appointment mode user: ${id} is requesting is invalid`);
      return res.status(400).json({ error: "Invalid appointment type" });
    }

    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);

    // Check minimum advance notice (1 hour)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (appointmentDateTime < oneHourFromNow) {
      logger.warning(`User: ${id} is scheduling appointment within 1 hour`);
      return res.status(400).json({ 
        error: "Appointments must be scheduled at least 1 hour in advance" 
      });
    }

    
    // Check patient's pending appointment limit (maximum 5)
    const pendingAppointmentsCount = await appointments.count({
      where: {
        user_id: id,
        appointment_status: 'pending'
      }
    });

    if (pendingAppointmentsCount >= 5) {
      logger.warning(`User:${id} trying to create appointment already has 5 existing pending appointments`);
      return res.status(400).json({ 
        error: "You can only have 5 pending appointments at a time. Please wait for current appointments to be completed or cancel some existing ones." 
      });
    }

    // Check for duplicate appointment (same user, same doctor, same date, same time)
    const duplicateAppointment = await appointments.findOne({
      where: {
        user_id: id,
        doctor_id,
        appointment_date: Sequelize.where(
          Sequelize.fn('DATE', Sequelize.col('appointment_date')),
          '=',
          appointment_date
        ),
        appointment_time: appointmentTimeFormatted,
        appointment_status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      }
    });

    if (duplicateAppointment) {
      logger.warning(`User: ${id} has already scheduled this doctor in the same slot`);
      return res.status(409).json({
        error: "You already have an appointment with this doctor at this date and time"
      });
    }

    // Create appointment
    const newAppointment = await appointments.create({
      doctor_id,
      user_id: id,
      appointment_date,
      appointment_time: appointmentTimeFormatted,
      appointment_type,
      appointment_status: "pending"
    });

    logger.info(`Request to schedule appointment by user: ${id} completed successfully`);

    return res.status(201).json({
      message: "Appointment scheduled successfully",
      appointment: newAppointment,
      info: {
        pending_appointments: pendingAppointmentsCount + 1,
        remaining_slots: 4 - pendingAppointmentsCount
      }
    });

  } catch (error) {
    logger.error("Error scheduling appointment:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = scheduleAppointment;
