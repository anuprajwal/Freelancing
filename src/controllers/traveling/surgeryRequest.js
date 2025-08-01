const { surgeryRequest, organisationProfile } = require("../../../models");

const createSurgeryRequest = async (req, res) => {
  try {
    const user_id = req.user.payload.id;
    const {
      hospital_id,
      surgery_name,
      date,
      time_slot,
      patient_name,
      patient_age,
      gender,
      contact_number,
      medical_history
    } = req.body;

    if (!hospital_id || !surgery_name || !date || !time_slot || !patient_name || !contact_number || !gender) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hospital = await organisationProfile.findByPk(hospital_id);
    if (!hospital) {
      return res.status(404).json({ error: "Hospital not found" });
    }

    if (!hospital.specializations_provided?.map(s => s.toLowerCase()).includes(surgery_name.toLowerCase())) {
      return res.status(400).json({ error: "Surgery not offered by this hospital" });
    }

    const newRequest = await surgeryRequest.create({
      user_id,
      hospital_id,
      surgery_name,
      date,
      time_slot,
      patient_name,
      patient_age,
      gender,
      contact_number,
      medical_history
    });

// fetch user and hospital info
// const user = req.user.payload;
// const hospitalInfo = `
//   Hospital: ${hospital.organisation_name}
//   Contact: ${hospital.contact_number}
//   Email: ${hospital.contact_email}
//   Website: ${hospital.website_url || "N/A"}
// `;

// await sendEmail(
//   user.email,
//   `Surgery Request Received: ${surgery_name}`,
//   `Dear ${user.username},\n\nYour request for "${surgery_name}" at ${hospital.organisation_name} has been received and is under process.\n\n${hospitalInfo}\n\nWe’ll notify you once it is accepted or rejected.\n\nThank you,\nDoc App`
// );


    return res.status(201).json({ message: "Surgery request submitted", request: newRequest });
  } catch (err) {
    console.error("Error submitting surgery request:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  
};


module.exports = {createSurgeryRequest}