const s3 = require("../savingSpaces/connectAwsS3");
const { appointmentDocuments, User, appointments } = require("../../../models");
const { v4: uuidv4 } = require("uuid");

// Upload Document
const uploadDocument = async (req, res) => {
  const { appointment_id } = req.body;
  const { id: user_id } = req.user.payload;

  console.log(appointment_id)

  if (!req.file) return res.status(400).send("No file uploaded");
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Invalid file type. Only images allowed." });
  }

  if (!appointment_id) return res.status(400).send("Appointment ID is required");

  try {
    const userData = await User.findByPk(user_id);
    if (!userData) return res.status(404).send("User not found");

    const appointmentData = await appointments.findByPk(appointment_id);
    if (!appointmentData) return res.status(404).send("Appointment not found");

    const emailUnique = userData.email.split("@");
    const mainFolder = `${userData.role}_${emailUnique}_${userData.phone_number}_main_folder`;

    const file = req.file;
    const fileName = `${uuidv4()}_${file.originalname}`;
    const key = `${mainFolder}/appointment_documents/${appointment_id}/${fileName}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.error("Error uploading to S3:", err);
        return res.status(500).send("Error uploading file");
      }

      const newDoc = await appointmentDocuments.create({
        user_id,
        appointment_id,
        document_name: file.originalname,
        document_url: data.Location,
        document_type: file.mimetype,
      });

      res.status(201).json({
        message: "Document uploaded successfully",
        document: newDoc,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Get all documents for an appointment
const getDocumentsByAppointment = async (req, res) => {
  const { appointment_id } = req.params;
  try {
    const docs = await appointmentDocuments.findAll({
      where: { appointment_id },
      order: [["created_at", "DESC"]],
    });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Get single document
const getDocumentById = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await appointmentDocuments.findOne({
      where: { id, user_id: req.user.payload.id },
    });
    if (!doc) return res.status(404).send("Document not found");
    const appointment = await appointments.findOne({
      where: {id : doc.appointment_id}
    })
    const doctorObj = await User.findByPk(appointment.doctor_id)
    console.log(doc.user_id, req.user.payload.id)
    console.log(doctorObj.id, req.user.payload.id)
    if (doc.user_id !== req.user.payload.id && doctorObj.id !== req.user.payload.id) return res.status(401).json({error:"unauthorised"})
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Update document (replace)
const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { appointment_id } = req.body;
  const { id: user_id } = req.user.payload;

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Invalid file type. Only images allowed." });
  }


  if (!req.file) return res.status(400).send("No file uploaded");

  try {
    const existingDoc = await appointmentDocuments.findOne({
      where: { id, user_id },
    });
    if (!existingDoc) return res.status(404).send("Document not found");

    // Delete existing file from S3
    const key = existingDoc.document_url.split(".amazonaws.com/")[1];
    await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();

    // Upload new file
    const file = req.file;
    const fileName = `${uuidv4()}_${file.originalname}`;
    const newKey = key.replace(/[^/]+$/, fileName); // replace file name only

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: newKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    s3.upload(params, async (err, data) => {
      if (err) {
        console.error("Error uploading new file:", err);
        return res.status(500).send("Error uploading file");
      }

      await existingDoc.update({
        document_name: file.originalname,
        document_url: data.Location,
        document_type: file.mimetype,
      });

      res.json({
        message: "Document updated successfully",
        document: existingDoc,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await appointmentDocuments.findByPk(id);
    if (!doc) return res.status(404).send("Document not found");

    const key = doc.document_url.split(".amazonaws.com/")[1];
    await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();

    await doc.destroy();
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByAppointment,
  getDocumentById,
  updateDocument,
  deleteDocument,
};
