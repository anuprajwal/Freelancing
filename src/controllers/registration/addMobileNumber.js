const { User } = require("../../../models");

const addMobileNumber = async (req, res) => {
    const { mobile_no } = req.body;

    try {
        // Check if user exists
        const userData = await User.findOne({
            where: { id: req.user.payload.id }
        });

        if (!userData) {
            return res.status(404).json({ error: "Cannot find the user" });
        }

        // Update mobile number
        await User.update(
            { phone_number: mobile_no },
            { where: { id: req.user.payload.id } }
        );

        return res.status(200).json({ message: "Mobile number added successfully" });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = addMobileNumber;
