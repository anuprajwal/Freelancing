const {
    User
} = require("../../models");

// not much use full

const validateUserRole = async (userId, expectedRole) => {
    console.log(userId)
    const user = await User.findByPk(userId);
    console.log(user)
    console.log("expectedRole", expectedRole);

    if (!user) {
        return null
    }

    if (user.role !== expectedRole) {
        return {
            error: `You are registered as a ${user.role}. Please complete your profile at /profile/complete/${user.role}`
        };
    }
    console.log("redirecting.....")
    return user;
};

module.exports = validateUserRole;