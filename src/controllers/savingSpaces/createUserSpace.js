const s3 = require('./connectAwsS3'); // adjust the path to your s3.js file

async function createS3UserFolders(bucketName, mainFolderName) {
  const folderKeys = [
    `${mainFolderName}/`,
    `${mainFolderName}/user_profile/`,
    `${mainFolderName}/user_documents/`
  ];

  for (const key of folderKeys) {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: '', // Empty object creates a "folder"
    };

    try {
      await s3.putObject(params).promise();
    } catch (err) {
      console.error(`Failed to create folder ${key}:`, err.message);
    }
  }
}


module.exports = createS3UserFolders