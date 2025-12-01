// controllers/payment/doctorKycController.js
const path = require("path");
const fs = require("fs");
const {
  razorpay,
  createLinkedAccount,
  createStakeholder,
  requestProductConfig,
  updateProductConfig,
  uploadDocument,
  updateKyc,
} = require("../../services/rzpService");
const { doctorProfile, User } = require("../../../models");

/**
 * POST /doctor/:id/create-linked-account
 * Creates: linked account, stakeholder, product config
 */
exports.createLinkedAccount = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await doctorProfile.findByPk(doctorId, { include: [{ model: User, as: "user" }] });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (doctor.rzp_account_id) return res.status(400).json({ message: "Already linked" });

    // 1. Linked account
    const account = await createLinkedAccount(doctor);
    doctor.rzp_account_id = account.id;
    doctor.joined_at = new Date();
    doctor.kyc_status = "pending";
    await doctor.save();

    // 2. Stakeholder (doctor)
    const stakeholderPayload = {
      name: doctor.user?.name || doctor.user?.full_name || "Doctor",
      email: doctor.user?.email || undefined,
      contact: doctor.phone || undefined,
      type: "individual",
      dob: doctor.date_of_birth ? new Date(doctor.date_of_birth).toISOString().split("T")[0] : undefined,
      permanent_address: { line1: doctor.address_line1 || "" },
    };
    const stakeholder = await createStakeholder(account.id, stakeholderPayload);
    doctor.stakeholder_id = stakeholder.id;
    await doctor.save();

    // 3. Request product config
    const product = await requestProductConfig(account.id);
    doctor.product_id = product.id;
    await doctor.save();

    // 4. If bank details already present, update product
    if (doctor.account_number && doctor.ifsc_code && doctor.beneficiary_name) {
      await updateProductConfig(account.id, product.id, {
        account_number: doctor.account_number,
        ifsc: doctor.ifsc_code,
        beneficiary_name: doctor.beneficiary_name,
      });
    }

    return res.json({ account_id: account.id, stakeholder_id: stakeholder.id, product_id: product.id });
  } catch (err) {
    console.error("createLinkedAccount err:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "Failed to create linked account" });
  }
};

/**
 * POST /doctor/:id/upload-kyc
 * multipart form: file field "document"
 * body: { type: "pan"|"bank_account"|"address", pan_number?, ifsc?, account_number?, address_line1? }
 */

exports.uploadKycDocument = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { type, pan_number, ifsc, account_number, address_line1 } = req.body;
    const doctor = await doctorProfile.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!doctor.rzp_account_id) return res.status(400).json({ message: "Linked account not created" });
    if (!req.file) return res.status(400).json({ message: "File required" });

    // temp file write
    const tmpPath = path.join(__dirname, "../../tmp", `${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    // upload to Razorpay Files API (purpose must match allowed values)
    const docId = await uploadDocument(tmpPath, type);

    // Persist doc ids + any fields
    if (type === "pan") {
      doctor.pan_doc_id = docId;
      if (pan_number) doctor.pan_number = pan_number;
    }
    if (type === "bank_account") {
      doctor.bank_doc_id = docId;
      if (account_number) doctor.account_number = account_number;
      if (ifsc) doctor.ifsc_code = ifsc;
    }
    if (type === "address") {
      doctor.address_doc_id = docId;
      if (address_line1) doctor.address_line1 = address_line1;
    }

    await doctor.save();

    // If all required docs + fields present -> update KYC on RZP and set status to submitted
    const hasAll = doctor.pan_doc_id && doctor.bank_doc_id && doctor.address_doc_id &&
                   doctor.pan_number && doctor.account_number && doctor.ifsc_code && doctor.address_line1;

    if (hasAll) {
      await updateKyc(doctor.rzp_account_id, {
        pan_number: doctor.pan_number,
        pan_doc_id: doctor.pan_doc_id,
        bank_doc_id: doctor.bank_doc_id,
        ifsc: doctor.ifsc_code,
        account_number: doctor.account_number,
        address_line1: doctor.address_line1,
        address_doc_id: doctor.address_doc_id,
      });
      doctor.kyc_status = "submitted";
      await doctor.save();
    }

    return res.json({ success: true, doc_id: docId, type });
  } catch (err) {
    console.error("uploadKycDocument err:", err.response?.data || err.message || err);
    return res.status(500).json({ message: "Failed to upload document" });
  }
};
