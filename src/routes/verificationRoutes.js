const exppress = require("express")
const verifyOtp = require("../controllers/verification/verifyEmail.js")
const sendEmailOtp = require("../controllers/verification/sendEmailOtp.js")
const sendMobileOtp = require("../controllers/verification/sendMobileOtp.js")
const protect = require("../middlewares/authMiddleware.js")
const checkAccountStatus = require("../middlewares/accountCheck.js")

const router = exppress.Router()

router.post('/sendEmailOtp' , protect, checkAccountStatus,  sendEmailOtp)
router.put('/verifyEmailMobile' , protect, checkAccountStatus,  verifyOtp)
router.post('/sendMobileOtp', protect, checkAccountStatus , sendMobileOtp)

module.exports = router;