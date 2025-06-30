const { appointments, User, doctorProfile } = require("../../../models");
const { Op, Sequelize } = require("sequelize");
const logger = require("../../../logger")

// Helper function to convert time string to minutes for accurate comparison
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const scheduleAppointment = async (req, res) => {
  try {
    const { payload } = req.user;
    const { id } = payload;

    logger.info(`request recieved to schedule new appointment from user: ${id}`)

    const { doctor_id, appointment_date, appointment_time, appointment_type } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time || !appointment_type) {
      logger.warning(`request made by user: ${id} has missing fields`)
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate date and time formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(appointment_date)) {
      logger.warning(`the date format in te request made by user: ${id}, is invalid`)
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    
    if (!timeRegex.test(appointment_time)) {
      logger.warning(`the time format in te request made by user: ${id}, is invalid`)
      return res.status(400).json({ error: "Invalid time format. Use HH:MM" });
    }

    const user = await User.findByPk(id);
    const doctor = await doctorProfile.findByPk(doctor_id);
    const doctorUser = await User.findByPk(doctor?.user_id);

    if (!doctor) {
      logger.warning(`the doctor user: ${id}, is searching for i not found in db`)
      return res.status(404).json({ error: "Doctor not found" });
    }

    if (user.role !== "general_user") {
      logger.warning(`the user requesting to create appointment is recognised as doctor`)
      return res.status(403).json({ error: "Only patients can schedule appointments" });
    }

    if (user.email === doctorUser.email) {
      logger.warning(`the user is recognised as patiend scheduling to his own account`)
      return res.status(400).json({ error: "You cannot schedule an appointment with yourself" });
    }

    if (!["online_video", "online_audio", "offline"].includes(appointment_type)) {
      logger.warning(`the appointment mode user: ${id} is requesting to is found invalid`)
      return res.status(400).json({ error: "Invalid appointment type" });
    }

    // Check current time and prevent past date/time bookings
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);
    
    // Check if appointment is in the past
    if (appointmentDateTime <= now) {
      logger.warning(`the request is found to be scheduling appointment in the past time`)
      return res.status(400).json({ 
        error: "Cannot schedule appointments in the past" 
      });
    }

    // Check minimum advance notice (1 hour)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (appointmentDateTime < oneHourFromNow) {
      logger.warning(`user: ${id} is found to be scheduling the appointment within 1 hour`)
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
      logger.warning(`the user:${id} who is trying to create appointment already has 5 existing pending appointments`)
      return res.status(400).json({ 
        error: "You can only have 5 pending appointments at a time. Please wait for current appointments to be completed or cancel some existing ones." 
      });
    }

    // Parse the appointment date to get the day of the week
    const appointmentDate = new Date(appointment_date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[appointmentDate.getDay()];

    // Check if doctor is available on this day
    const availability = doctor.availability_schedule;
    const daySchedule = availability[dayOfWeek];

    // Check if doctor works on this day
    if (!daySchedule || !daySchedule.start || !daySchedule.end) {
      logger.warning(`the user : ${id} is trying to schedule doctor in his leasure date`)
      return res.status(400).json({ 
        error: "Doctor is not available on ${dayOfWeek}s "
      });
    }

    // Check if appointment time is within doctor's working hours
    const appointmentTimeFormatted = appointment_time.length === 5 ? `${appointment_time}:00` : appointment_time;
    const requestedTime = appointmentTimeFormatted.slice(0, 5); // Get HH:MM format
    
    // Convert times to minutes for accurate comparison
    const requestedMinutes = timeToMinutes(requestedTime);
    const startMinutes = timeToMinutes(daySchedule.start);
    const endMinutes = timeToMinutes(daySchedule.end);
    
    if (requestedMinutes < startMinutes || requestedMinutes >= endMinutes) {
      logger.warning(`the user : ${id} is trying to schedule doctor in his leasure time`)
      return res.status(400).json({ 
        error: "Doctor is only available from ${daySchedule.start} to ${daySchedule.end} on ${dayOfWeek}s "
      });
    }

    // Check if appointment time conflicts with doctor's break times
    if (daySchedule.breaks && daySchedule.breaks.length > 0) {
      for (const breakTime of daySchedule.breaks) {
        const [breakStart, breakEnd] = breakTime.split('-');
        // Convert time strings to minutes for accurate comparison
        const requestedMinutes = timeToMinutes(requestedTime);
        const breakStartMinutes = timeToMinutes(breakStart);
        const breakEndMinutes = timeToMinutes(breakEnd);
        
        if (requestedMinutes >= breakStartMinutes && requestedMinutes < breakEndMinutes) {
          logger.warning(`the user : ${id} is trying to schedule doctor in his leasure time`)
          return res.status(400).json({ 
            error: "Doctor is on break from ${breakStart} to ${breakEnd} "
          });
        }
      }
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
          [Op.notIn]: ['cancelled', 'completed'] // Allow rescheduling if previous was cancelled/completed
        }
      }
    });

    if (duplicateAppointment) {
      logger.warning(`the user : ${id} has already scheduled this doctor in the same slot`)
      return res.status(409).json({
        error: "You already have an appointment with this doctor at this date and time"
      });
    }

    // Convert appointment_date + appointment_time to a Date object in UTC
    const appointmentDateTimeUTC = new Date(`${appointment_date}T${appointmentTimeFormatted}Z`);

    // Calculate the time window: 30 minutes before and after
    const windowStart = new Date(appointmentDateTimeUTC.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(appointmentDateTimeUTC.getTime() + 30 * 60 * 1000);

    // Check for existing appointments within the time window for the same doctor
    const existingAppointment = await appointments.findOne({
      where: {
        doctor_id,
        appointment_date: Sequelize.where(
          Sequelize.fn('DATE', Sequelize.col('appointment_date')),
          '=',
          appointment_date
        ),
        appointment_time: {
          [Op.between]: [
            windowStart.toISOString().slice(11, 19), // HH:MM:SS
            windowEnd.toISOString().slice(11, 19)
          ]
        },
        appointment_status: {
          [Op.notIn]: ['cancelled', 'completed'] // Only check active appointments
        }
      }
    });

    if (existingAppointment) {
      logger.warning(`the user : ${id} who is trying to schedule doctor is about to have break in 30 mins`)
      return res.status(409).json({
        error: "Doctor has another appointment within 30 minutes of the requested time"
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

    logger.info(`the request to schedule appointment by user: ${id} is complete succesfully`)

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