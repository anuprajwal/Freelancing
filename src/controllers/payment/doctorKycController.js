const {
  razorpay,
  createLinkedAccount,
  updateKyc,
  uploadDocument
} = require("../../services/rzpService.js");

const { doctorProfile, User } = require("../../../models");


exports.createLinkedAccount = async (req, res) => {
  try {
    const doctorId = req.params.id;

    const doctor = await doctorProfile.findByPk(doctorId, {
      include: [{ model: User, as: "user" }],
    });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (doctor.rzp_account_id)
      return res.status(400).json({ message: "Already linked" });

    const account = await createLinkedAccount(doctor);

    doctor.rzp_account_id = account.id;
    doctor.joined_at = new Date();
    doctor.kyc_status = "pending";
    await doctor.save();

    res.json({
      message: "Linked account created",
      account_id: account.id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
};


exports.uploadKycDocument = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { type, pan_number, ifsc, account_number, address_line1 } = req.body; 
    // type: "pan" | "bank" | "address"

    const doctor = await doctorProfile.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.rzp_account_id)
      return res.status(400).json({ message: "Linked account not created" });

    if (!req.file) return res.status(400).json({ message: "File required" });

    // Save file temporarily
    const tmpPath = path.join(__dirname, "../../tmp", req.file.originalname);
    fs.writeFileSync(tmpPath, req.file.buffer);

    // Upload to Razorpay
    const doc_id = await uploadDocument(tmpPath, type);

    // Store doc_id in doctorProfile ,, i hvae not added this fields in the doctor profile , if you want to store this details about the doctor then create fields for it in the doctor profile 
    if (type === "pan") doctor.pan_doc_id = doc_id;
    if (type === "bank") doctor.bank_doc_id = doc_id;
    if (type === "address") doctor.address_doc_id = doc_id;

    await doctor.save();

    // Call updateKyc if all required documents + details are present
    if (
      doctor.pan_doc_id &&
      doctor.bank_doc_id &&
      doctor.address_doc_id &&
      pan_number &&
      ifsc &&
      account_number &&
      address_line1
    ) {
      await updateKyc(doctor.rzp_account_id, {
        pan_number,
        pan_doc_id: doctor.pan_doc_id,
        bank_doc_id: doctor.bank_doc_id,
        ifsc,
        account_number,
        address_line1,
        address_doc_id: doctor.address_doc_id,
      });
    }

    res.json({
      message: "Document uploaded successfully",
      doc_id,
      type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "KYC upload failed" });
  }
};



exports.razorpayWebhook = async (req, res) => {
  try {
    const event = req.body.event;
    const accountId = req.body.account_id;

    const doctor = await doctorProfile.findOne({
      where: { rzp_account_id: accountId },
    });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    switch (event) {
      case "account.kyc.verified":
        doctor.kyc_status = "verified";
        break;

      case "account.kyc.rejected":
        doctor.kyc_status = "failed";
        break;

      default:
        break;
    }

    await doctor.save();
    res.json({ status: "ok" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Webhook error" });
  }
};
