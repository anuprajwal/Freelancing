const exppress = require("express")
const verifyOtp = require("../controllers/verification/verifyEmail.js")
const sendEmailOtp = require("../controllers/verification/sendEmailOtp.js")
const sendMobileOtp = require("../controllers/verification/sendMobileOtp.js")
const protect = require("../middlewares/authMiddleware.js")
const checkAccountStatus = require("../middlewares/accountCheck.js")

const router = exppress.Router()

router.post('/sendEmailOtp' , checkAccountStatus, protect , sendEmailOtp)
router.put('/verifyEmailMobile' , checkAccountStatus, protect , verifyOtp)
router.post('/sendMobileOtp', checkAccountStatus ,protect , sendMobileOtp)

module.exports = router;