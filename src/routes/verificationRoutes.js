const exppress = require("express")
const verifyEmail = require("../controllers/verification/verifyEmail.js")
const sendEmailOtp = require("../controllers/verification/sendEmailOtp.js")
const sendMobileOtp = require("../controllers/verification/sendMobileOtp.js")
const verifyMobile = require("../controllers/verification/verifyPhone.js")
const protect = require("../middlewares/authMiddleware.js")

const router = exppress.Router()

router.post('/sendEmailOtp' , protect , sendEmailOtp)
router.post('/verifyEmial' , protect , verifyEmail)
router.post('/sendMobileOtp' ,protect , sendMobileOtp)
router.post('/verifyMobileOtp' , protect , verifyMobile)

module.exports = router();