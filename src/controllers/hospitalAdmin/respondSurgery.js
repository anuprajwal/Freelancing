const { surgeryRequest, organisationProfile, User } = require("../../models");
const sendEmail = require("../../utils/sendEmail");

const respondToSurgeryRequest = async (req, res) => {
  try {
    const admin_id = req.user.payload.id;
    const request_id = req.params.id;
    const { action } = req.body.action?.toLowerCase();

    //  Validate input
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use 'accept' or 'reject'." });
    }

    // Fetch the hospital (admin's organisation)
    const hospital = await organisationProfile.findOne({ where: { user_id: admin_id } });
    if (!hospital) {
      return res.status(404).json({ error: "Hospital profile not found for this admin." });
    }

    //  Find the request by ID and hospital
    const request = await surgeryRequest.findOne({
      where: { id: request_id, hospital_id: hospital.id }
    });

    if (!request) {
      return res.status(404).json({ error: "Surgery request not found or unauthorized." });
    }

    // Update status based on action
    const newStatus = action === "accept" ? "accepted" : "rejected";
    await request.update({ status: newStatus });

    //  Fetch user for notification
    const user = await User.findByPk(request.user_id);

    //  Send appropriate email
    if (newStatus === "accepted") {
      await sendEmail(
        user.email,
        `Your Surgery Request is Accepted`,
        `Dear ${user.username},\n\n Your request for "${request.surgery_name}" at ${hospital.organisation_name} has been **accepted**.\n\nThe hospital will contact you soon for further coordination.\n Contact: ${hospital.contact_number}\n🌐 Website: ${hospital.website_url || "N/A"}\n\nRegards,\nDoc App`
      );
    } else {
      await sendEmail(
        user.email,
        `Your Surgery Request was Rejected`,
        `Dear ${user.username},\n\nUnfortunately, your request for "${request.surgery_name}" at ${hospital.organisation_name} has been **rejected**.\n\nYou may try contacting the hospital directly or request another hospital.\n Contact: ${hospital.contact_number}\n🌐 Website: ${hospital.website_url || "N/A"}\n\nRegards,\nDoc App`
      );
    }

    return res.status(200).json({
      message: `Request successfully ${newStatus}.`,
      request,
    });
  } catch (err) {
    console.error("Error responding to surgery request:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { respondToSurgeryRequest };
