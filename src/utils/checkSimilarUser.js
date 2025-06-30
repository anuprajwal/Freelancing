const { User } = require("../../models");


// not needed. just to see whether user has 2 profiles.
const checkSimilarUser = async (user, checkRole) => {
    const DoctorUser = await User.findOne({where: {email: user.email, role: checkRole}});

    if (DoctorUser) {
      return true;
    }
    return false;
};

module.exports = checkSimilarUser;
