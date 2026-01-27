// middleware/checkAccountStatus.js

const {
    User
} = require("../../models");

const checkAccountStatus = async (req, res, next) => {
    try {
        const userId =
            req.user && req.user.payload && req.user.payload.id ?
            req.user.payload.id :
            null; // assuming JWT middleware sets req.user

        console.log("a minute...", userId)

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated"
            });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                message: "User does not exist"
            });
        }

        if (user.account_status === "active") {
            return next();
        }

        if (user.account_status === "holded") {
            return res.status(403).json({
                message: "Your account is currently on hold. Please contact support."
            });
        }

        if (user.account_status === "deleted") {
            return res.status(403).json({
                message: "Your account has been deleted. Please contact support."
            });
        }

    } catch (err) {
        console.error("Account status middleware error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = checkAccountStatus;