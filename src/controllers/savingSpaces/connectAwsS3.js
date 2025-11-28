const AWS = require('aws-sdk');
require('dotenv').config();

console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID);
console.log('Secret Key:', process.env.AWS_SECRET_ACCESS_KEY);
console.log('Region:', process.env.AWS_REGION);


const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,     // Your IAM user credentials
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });


module.exports = s3