const checkAnotherAppointment = async (doctor_id, date, start, end) => {
    const existing = await appointments.findOne({
      where: {
        doctor_id,
        appointment_date : date,
        appointment_start_time : start,
        appointment_end_time: end
      }
    });
  
    return !!existing; // true if already booked
  }

  module.exports = checkAnotherAppointment