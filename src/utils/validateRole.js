const { User } = require("../../models");

// not much use full

const validateUserRole = async (userId, expectedRole) => {
  const user = await User.findByPk(userId);
  console.log("expectedRole",expectedRole);

  if (!user) {
    return null
  }

  if (user.role !== expectedRole) {
    return {
      error: `You are registered as a ${user.role}. Please complete your profile at /profile/complete/${user.role}`
    };
  }

  return user; 
};

module.exports = validateUserRole;
