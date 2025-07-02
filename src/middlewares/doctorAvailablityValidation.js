const { doctorProfile } = require("../models");
const logger = require("../logger");

// Helper function to convert time string to minutes for accurate comparison
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const validateDoctorAvailability = async (req, res, next) => {
  try {
    const { payload } = req.user;
    const { id } = payload;
    const { doctor_id, appointment_date, appointment_time } = req.body;

    // Get doctor profile
    const doctor = await doctorProfile.findByPk(doctor_id);
    
    if (!doctor) {
      logger.warning(`Doctor with id ${doctor_id} not found for user: ${id}`);
      return res.status(404).json({ error: "Doctor not found" });
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
      logger.warning(`User: ${id} is trying to schedule doctor on his leisure date`);
      return res.status(400).json({ 
        error: `Doctor is not available on ${dayOfWeek}s`
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
      logger.warning(`User: ${id} is trying to schedule doctor outside working hours`);
      return res.status(400).json({ 
        error: `Doctor is only available from ${daySchedule.start} to ${daySchedule.end} on ${dayOfWeek}s`
      });
    }

    // Check if appointment time conflicts with doctor's break times
    if (daySchedule.breaks && daySchedule.breaks.length > 0) {
      for (const breakTime of daySchedule.breaks) {
        const [breakStart, breakEnd] = breakTime.split('-');
        // Convert time strings to minutes for accurate comparison
        const breakStartMinutes = timeToMinutes(breakStart);
        const breakEndMinutes = timeToMinutes(breakEnd);
        
        if (requestedMinutes >= breakStartMinutes && requestedMinutes < breakEndMinutes) {
          logger.warning(`User: ${id} is trying to schedule doctor during break time`);
          return res.status(400).json({ 
            error: `Doctor is on break from ${breakStart} to ${breakEnd}`
          });
        }
      }
    }

    // Attach doctor and formatted time data to request for controller use
    req.doctorAvailabilityData = {
      doctor,
      appointmentTimeFormatted,
      dayOfWeek
    };

    next();

  } catch (error) {
    logger.error("Error in doctor availability validation middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { validateDoctorAvailability };