const {
    notificationTokens
} = require("../../../models")


const saveUserToken = async (req, res) => {
    const {
        token,
        platform
    } = req.body;
    const {
        id
    } = req.user.payload;

    if (!token || !id || !platform) {
        return res.status(400).json({
            error: "all the fields are required"
        });
    }

    try {

        // Delete old tokens for this user + platform
        await notificationTokens.destroy({
            where: {
                user_id: id,
                platform: platform
            }
        });

        // Create new token
        await notificationTokens.create({
            user_id: id,
            token,
            platform
        });

        return res.status(200).json({
            status: 'Token saved successfully'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: 'Server error'
        });
    }
};


module.exports = saveUserToken