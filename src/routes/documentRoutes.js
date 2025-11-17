const express = require("express");
const router = express.Router();
const  protect  = require("../middlewares/authMiddleware.js");
const checkAccountStatus = require("../middlewares/accountCheck.js")
const uploadDocuments = require("../controllers/supportingDocuments/uploadDocuments.js")
const getDocuments = require("../controllers/supportingDocuments/getDocuments.js")
const upload = require("../controllers/savingSpaces/connectCloudDb.js")


//protected routes
router.post("/upload-document", checkAccountStatus, protect, upload.single('document'), uploadDocuments);
router.get("/get-documents", checkAccountStatus, protect, getDocuments);



module.exports = router;
