const {appointments, doctorProfile} = require('../../../models')


const appointmentUpdateByDoctor = async (req, res) => {
    try {
      const { id } = req.user.payload;
      const { appointment_id, appointment_status, prescription = null } = req.body;
  
      // Validate required fields
      if (!appointment_id) {
        return res.status(400).json({ error: "appointment_id is required" });
      }
  
      if (!appointment_status || appointment_status !== "closed") {
        return res.status(400).json({ error: "Appointment status must be 'closed'" });
      }
  
      // Check if doctor user exists
      const doctorUser = await doctorProfile.findOne({ where: { user_id: id } });
      if (!doctorUser) {
        return res.status(400).json({
          error: "User is not authorized to update appointment",
        });
      }
  
      // Find appointment
      const appointment_data = await appointments.findOne({
        where: { id: appointment_id, doctor_id: id },
      });
  
      if (!appointment_data) {
        return res.status(400).json({
          error: "Appointment not found for this doctor",
        });
      }
  
      // Convert prescription array → TEXT (JSON string)
      const prescriptionString = prescription ? JSON.stringify(prescription) : null;
  
      // Update
      await appointments.update(
        {
          appointment_status,
          prescription: prescriptionString,
        },
        { where: { id: appointment_id, doctor_id: id } }
      );
  
      return res.json({
        message: "Appointment updated successfully",
        appointment_id,
      });
    } catch (err) {
      console.error("Error updating appointment:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  

  const getPrescription = async (req, res) => {
    try {
      const { appointment_id } = req.params;
      const { id } = req.user.payload;
  
      if (!appointment_id) {
        return res.status(400).json({ error: "appointment_id is required" });
      }
  
      // Validate that doctor owns this appointment
      const appointment = await appointments.findOne({
        where: { id: appointment_id },
      });

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      const { id: userId, scope } = req.user.payload;

      // Access logic
      let allowed = false;

      if (scope === "doctor") {
        if (appointment.doctor_id === userId) {
          allowed = true;
        }
      }

      if (scope === "general_user") {
        if (appointment.user_id === userId) {
          allowed = true;
        }
      }

      if (!allowed) {
        return res.status(403).json({ error: "You are not allowed to view this appointment/prescription" });
      }
  
      // Convert TEXT → JSON
      let prescriptionData = null;
      if (appointment.prescription) {
        try {
          prescriptionData = JSON.parse(appointment.prescription);
        } catch (err) {
          prescriptionData = appointment.prescription; // return raw text if parsing fails
        }
      }
  
      return res.json({
        appointment_id,
        prescription: prescriptionData,
      });
    } catch (err) {
      console.error("Error fetching prescription:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  


module.exports = {appointmentUpdateByDoctor, getPrescription}