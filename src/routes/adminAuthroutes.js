const express = require("express");
const router = express.Router();
const  loginAdmin = require("../controllers/admin/adminAuthcontroller.js");
const getAllStats = require("../controllers/admin/adminPanelstats.js");
// const sendEmails = require("../controllers/admin/sendEmails.js")
const verifyAdminAuth = require("../middlewares/verifyAdminAuth.js");
// const addPackage = require("../controllers/admin/addPackage.js");
const {approveDoctors, approveHospitals} = require("../controllers/registration/verify.js")
const registerAdmin = require("../controllers/admin/regesterAdmin.js")
const getUnverifiedAccounts = require("../controllers/admin/getUnverifiedAccs.js")
const {
  holdAccount,
  deleteAccount,
  resumeAccount,
  getHoldedAccounts
} = require("../controllers/admin/accountManagement.js")
const searchAccounts = require("../controllers/filters/searchAccounts.js")


router.post("/login", loginAdmin);
router.post("/disabled/admin/create/acc", registerAdmin)

//protected routes
router.get("/stats", verifyAdminAuth, getAllStats);
// router.post("/send-email", verifyAdminAuth, sendEmails)
// router.post("/add-package" , verifyAdminAuth , addPackage);
router.put("/hold-account/:userId", verifyAdminAuth, holdAccount)
router.put("/delete-account/:userId", verifyAdminAuth, deleteAccount)
router.get("/resume-account/:userId", verifyAdminAuth, resumeAccount)
router.get("/get-holded-accounts", verifyAdminAuth, getHoldedAccounts)
router.put("/approve-doctor", verifyAdminAuth, approveDoctors)
router.put("/approve-hospital", verifyAdminAuth, approveHospitals)
router.get("/get-unverified-acc", verifyAdminAuth, getUnverifiedAccounts)
router.get("/search-accounts", verifyAdminAuth, searchAccounts)


module.exports = router;
