const s3 = require("../savingSpaces/connectAwsS3");
const { User, generalUser, doctorProfile, organisationProfile } = require("../../../models");

const deleteProfilePic = async (req, res) => {
  const { id } = req.user.payload;

  try {
    const userData = await User.findByPk(id);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const emailUnique = userData.email.split("@");
    const mainFolder = `${userData.role}_${emailUnique}_${userData.phone_number}_main_folder`;
    const key = `${mainFolder}/user_profile/profile_pic.jpg`;

    // Step 1: Check if file exists
    try {
      await s3.headObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();
      console.log("Profile pic found. Deleting...");
    } catch (err) {
      if (err.code === "NotFound") {
        return res.status(404).json({ error: "No profile picture found to delete" });
      }
      throw err;
    }

    // Step 2: Delete from S3
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }).promise();

    console.log("Deleted from S3");

    // Step 3: Update DB to remove profile_picture URL
    if (userData.role === "general_user") {
      await generalUser.update(
        { profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270802/profile_11121549_dtesby.png" },
        { where: { user_id: id } }
      );
    } else if (userData.role === "doctor") {
      await doctorProfile.update(
        { profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270760/doctor_8997187_mgopyu.png" },
        { where: { user_id: id } }
      );
    } else if (userData.role === "hospital_organisation") {
      await organisationProfile.update(
        { profile_picture: "https://res.cloudinary.com/dwshjkk42/image/upload/v1751270847/hospital-building_4821512_qr0gvo.png" },
        { where: { user_id: id } }
      );
    }

    return res.status(200).json({ message: "Profile picture deleted successfully" });

  } catch (error) {
    console.error("Error deleting profile pic:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = deleteProfilePic;
