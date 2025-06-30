const { User } = require("../../models");

// not much use full

const validateUserRole = async (userId, expectedRole, res) => {
  const user = await User.findByPk(userId);
  console.log("expectedRole",expectedRole);
  console.log("id",user);

  if (!user) {
    return none
  }

  if (user.role !== expectedRole) {
    return {
      error: `You are registered as a ${user.role}. Please complete your profile at /profile/complete/${user.role}`
    };
  }

  return user; 
};

module.exports = validateUserRole;
