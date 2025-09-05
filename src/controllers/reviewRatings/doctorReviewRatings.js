const { doctorProfile, reviewRating, appointments, User } = require("../../../models");
const checkSimilarUser = require("../../utils/checkSimilarUser");

// API to ive ratings to the doctor based on each appointment
const createDoctorReviewRating = async (req, res) => {
  const { appointment_id, rating, review } = req.body;
  console.log("appointment_id", appointment_id, "rating", rating, "review", review);
  if (!appointment_id || !rating || !review) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }
  const { userId } = req.user;

  const user = await User.findByPk(userId);
  if (user.role !== "general_user") {
    return res.status(404).json({ error: "User is not a general user" });
  }

  const appointment_consulted = await appointments.findOne({where: {id: appointment_id, user_id: userId}});
  
  const checkDoctorPatient = await checkSimilarUser(user,  "doctor");
  if (checkDoctorPatient) {
    return res.status(404).json({ error: "can't rate your own appointment" });
  }

  

  if (!appointment_consulted) {
    return res.status(404).json({ error: "User or appointment not found" });
  }
  if (appointment_consulted.appointment_status !== "closed") {
    return res.status(404).json({ error: "Appointment not completed" });
  }

  try {
    const doctor = await doctorProfile.findByPk(appointment_consulted.doctor_id);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const createdReviewRating = await reviewRating.create({
      doctor_id: appointment_consulted.doctor_id,
      appointment_id: appointment_consulted.id,
      rating: rating,
      review: review,
    });

    return res.status(201).json({ message: "Doctor review rating created successfully", createdReviewRating });
    
  } catch (error) {
    console.error("Error creating doctor review rating:", error);
    res.status(500).json({ error: "Failed to create doctor review rating" });
  }
};

module.exports = { createDoctorReviewRating };