const generateUUID = require('../savingSpaces/generateUuid')
const {documents, User} = require("../../../models")
const s3 = require("../savingSpaces/connectAwsS3")


const uploadDocuments = async (req, res)=>{
    const {id} = req.user.payload
    if (!req.file) return res.status(400).send('No file uploaded');

    if (!req.body.documentName) return res.status(400).send('document name is needed')

    const docNameExists = await documents.findOne({where:{user_id:id, document_type:req.body.documentName}})

    if (docNameExists){
        return res.status(400).json({error:`the document ${req.body.documentName} already exists in the user db`})
    }


    const userData = await User.findByPk(id)
  
    const file = req.file;
    const fileName = `user_document_${generateUUID()}.jpg`
    const emailUnique = userData.email.split("@")
    const mainFolder = `${userData.role}_${emailUnique}_${userData.phone_number}_main_folder`

    const key = `${mainFolder}/user_documents/${fileName}`;

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

        await documents.create({
            document_type: req.body.documentName,     
            user_id: req.user.payload.id,                       
            document_url: data.Location,       
        })
        res.json({ imageUrl: data.Location });
    });

}

module.exports = uploadDocuments