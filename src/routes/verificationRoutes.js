const exppress = require("express")
const verifyOtp = require("../controllers/verification/verifyEmail.js")
const sendEmailOtp = require("../controllers/verification/sendEmailOtp.js")
const sendMobileOtp = require("../controllers/verification/sendMobileOtp.js")
const protect = require("../middlewares/authMiddleware.js")

const router = exppress.Router()

router.post('/sendEmailOtp' , protect , sendEmailOtp)
router.put('/verifyEmailMobile' , protect , verifyOtp)
router.post('/sendMobileOtp' ,protect , sendMobileOtp)

module.exports = router;