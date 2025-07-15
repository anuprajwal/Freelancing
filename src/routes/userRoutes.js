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


const router = express.Router();

// Step 1: Register Basic User (Common Schema)
router.post("/register", registerUser);

// Step 2: Complete Profile (Role-Based)
router.put("/profile/complete/general_user", protect, completePatientProfile);
router.put("/profile/complete/doctor", protect, completeDoctorProfile);
router.put("/profile/complete/extra-doc-info", protect, updateExtraDocInfo)
router.put("/profile/complete/hospital_organisation", protect, completeOrganisationProfile);


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


router.post("/login/doctor")

router.get("/get-user-data", protect, getUserDetails)

router.get("/show-slots/:doctor_id", protect, showSlots)

module.exports = router;
