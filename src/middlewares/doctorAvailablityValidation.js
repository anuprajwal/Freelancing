const { doctorProfile } = require("../../models");
const logger = require("../../logger");

// Helper function to convert time string to minutes for accurate comparison
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const validateDoctorAvailability = async (req, res, next=null, appointmentDetails=null) => {
  try {
    const { payload } = req.user;
    const { id } = payload;
    let doctor_id,appointment_date, appointment_time 
    if (appointmentDetails){
      doctor_id = appointmentDetails.doctor_id
      appointment_date = appointmentDetails.appointment_date
      appointment_time = appointmentDetails.appointment_time
    }else{
      doctor_id = req.body
      appointment_date = req.body
      appointment_time = req.body
    }
    

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

    const now = new Date();
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);
    
    // Check if appointment is in the past
    if (appointmentDateTime <= now) {
      logger.warning(`Request is scheduling appointment in the past time`);
      return res.status(400).json({ 
        error: "Cannot schedule appointments in the past" 
      });
    }
    
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
            windowStart.toISOString().slice(11, 19),
            windowEnd.toISOString().slice(11, 19)
          ]
        },
        appointment_status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      }
    });

    if (existingAppointment) {
      logger.warning(`User: ${id} trying to schedule doctor who has another appointment within 30 mins`);
      return res.status(409).json({
        error: "Doctor has another appointment within 30 minutes of the requested time"
      });
    }

    // Attach doctor and formatted time data to request for controller use
    req.doctorAvailabilityData = {
      doctor,
      appointmentTimeFormatted,
      dayOfWeek
    };

    if (next){
      next();
    }
  } catch (error) {
    logger.error("Error in doctor availability validation middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { validateDoctorAvailability };