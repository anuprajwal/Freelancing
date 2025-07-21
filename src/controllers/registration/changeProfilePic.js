const s3 = require("../savingSpaces/connectAwsS3")
const {User, generalUser, doctorProfile, organisationProfile} = require("../../../models")



const uploadProfilePic = async (req, res) => {
    const {id} = req.user.payload
    if (!req.file) return res.status(400).send('No file uploaded');

    const userData = await User.findByPk(id)
  
    const file = req.file;
    const fileName = 'profile_pic.jpg'
    const emailUnique = userData.email.split("@")
    const mainFolder = `${userData.role}_${emailUnique}_${userData.phone_number}_main_folder`

    const key = `${mainFolder}/user_profile/${fileName}`;

    try {
      await s3.headObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();
      console.log('Existing profile_pic found. Deleting...');

      // Step 2: Delete it
      await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();
      console.log('Old profile_pic deleted.');
    } catch (headErr) {
      if (headErr.code !== 'NotFound') {
        throw headErr; // throw other errors
      }
      console.log('No existing profile_pic found.');
    }

  
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    };
  
    s3.upload(params, async (err, data) => {
      if (err) {
        console.error('Error uploading to S3:', err);
        return res.status(500).send('Error uploading image');
      }

      const userData = await User.findByPk(id)

      if (userData.role === "general_user"){
        await generalUser.update({
            profile_picture: data.Location
          },
        {
            where:{ user_id: id}
        })
      }else if (userData.role === "doctor"){
        await doctorProfile.update({
            profile_picture: data.Location
          },
        {
            where:{ user_id: id}
        })
      }else if (userData.role === "hospital_organisation"){
        await organisationProfile.update({
            profile_picture: data.Location
          },
        {
            where:{ user_id: id}
        })
      }
      
      res.json({ imageUrl: data.Location });
    });
  };

module.exports = uploadProfilePic