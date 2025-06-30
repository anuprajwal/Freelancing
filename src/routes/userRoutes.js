const express = require("express");
const  registerUser  = require("../controllers/registration/userRegistration.js");
const  {completePatientProfile}  = require("../controllers/registration/completePatProfile.js");
const  {loginUser, generateToken, loginDoctor}  = require("../controllers/login/login.js");
const {completeDoctorProfile} = require("../controllers/registration/completeDocProfile.js");
// const { completeOrganisationProfile } = require("../controllers/registration/completeOrgProfile.js");
require("../controllers/registration/googleOAuth.js");
const  protect  = require("../middlewares/authMiddleware.js");
const passport = require("passport");

const router = express.Router();

// Step 1: Register Basic User (Common Schema)
router.post("/register", registerUser);

// Step 2: Complete Profile (Role-Based)
router.put("/profile/complete/general_user", protect, completePatientProfile);
router.put("/profile/complete/doctor", protect, completeDoctorProfile);
// router.put("/profile/complete/hospital_organisation", protect, completeOrganisationProfile);


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



// Step 3: Login General User
router.route("/login/general_user")
    .post(loginUser);


router.post("/login/doctor")

module.exports = router;
