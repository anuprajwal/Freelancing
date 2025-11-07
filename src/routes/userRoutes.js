const express = require("express");
const  registerUser  = require("../controllers/registration/userRegistration.js");
const  {completePatientProfile}  = require("../controllers/registration/completePatProfile.js");
const  {loginUser, generateToken}  = require("../controllers/login/login.js");
const {completeDoctorProfile} = require("../controllers/registration/completeDocProfile.js");
const completeOrganisationProfile = require("../controllers/registration/registerOrganisation.js");
require("../controllers/registration/googleOAuth.js");
const  protect  = require("../middlewares/authMiddleware.js");
const passport = require("passport");
const updateExtraDocInfo = require("../controllers/registration/extraDocInfo.js");
const getUserDetails = require("../controllers/registration/getUserData.js")
const showSlots = require("../controllers/slots/showSlots.js")
const uploadProfilePic = require("../controllers/registration/changeProfilePic.js")
const upload = require("../controllers/savingSpaces/connectCloudDb.js")
const completeManagerProfile = require("../controllers/registration/completeManagerProfile.js");
const addAgent = require("../controllers/registration/addAgent.js");
const forgotPassword = require("../controllers/registration/forgotPassword.js")
const changePassword = require("../controllers/registration/changePassword.js")
const changeForgottenPassword = require("../controllers/registration/changeForgotedPassword.js")
const updateLocation = require("../controllers/address/userLocation.js")
const {approveDoctors, approveHospitals} = require("../controllers/registration/verify.js")
const router = express.Router();

// Step 1: Register Basic User (Common Schema)
router.post("/register", registerUser);

// Step 2: Complete Profile (Role-Based)
router.put("/profile/complete/general_user", protect, completePatientProfile);
router.put("/profile/complete/doctor", protect, completeDoctorProfile);
router.put("/profile/complete/extra-doc-info", protect, updateExtraDocInfo)
router.put("/profile/complete/hospital_organisation", protect, completeOrganisationProfile);
router.put("/profile/complete/manager", protect, completeManagerProfile);
router.post("/profile/complete/agent", protect, addAgent);

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }),
);


router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const { user } = req.user;
        const token = generateToken(user, req.ip);  
        res.cookie("token", token.token, {
            httpOnly: true,  
            secure: false,   
            sameSite: "Strict",
            maxAge: token.expiresIn, 
        });
        res.json({ user, token: token.token });
    }
);



// Step 3: Login
router.route("/login")
    .post(loginUser);

router.post('/forgot-password', forgotPassword)

router.put("/change-password", protect, changePassword)

router.put("/change-forgoten-password/:password_hash/:id", changeForgottenPassword)

router.get("/get-user-data", protect, getUserDetails)

router.get("/show-slots/:doctor_id", showSlots)

router.post("/upload-photo", protect, upload.single('image'), uploadProfilePic)

router.put("/approve-doctor", protect, )

module.exports = router;
