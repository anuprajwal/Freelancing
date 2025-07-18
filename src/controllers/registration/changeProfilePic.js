const s3 = require("./connectAwsS3")
const path = require('path');
const {User, generalUser, doctorProfile, organisationProfile} = require("../../../models")



const uploadProfilePic = (req, res) => {
    const {id} = req.user.payload
    if (!req.file) return res.status(400).send('No file uploaded');
  
    const file = req.file;
    const fileName = Date.now() + path.extname(file.originalname);
  
    
const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
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