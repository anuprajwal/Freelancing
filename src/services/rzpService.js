const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SECRET
});

async function createLinkedAccount(doctor) {
  return await razorpay.accounts.create({
    name: doctor.user.name,
    email: doctor.user.email,
    type: "route",
    tnc_accepted: true
  });
}

async function updateKyc(accountId, kycData) {
  return await razorpay.accounts.update(accountId, {
    kyc: {
      pan: {
        number: kycData.pan_number,
        document_id: kycData.pan_doc_id
      },
      bank_account: {
        ifsc: kycData.ifsc,
        account_number: kycData.account_number,
        document_id: kycData.bank_doc_id
      },
      address: {
        line1: kycData.address_line1,
        document_id: kycData.address_doc_id
      }
    }
  });
}

const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");

async function uploadDocument(filePath, type) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("purpose", type);

  const response = await axios.post(
    "https://api.razorpay.com/v1/files",
    form,
    {
      auth: {
        username: process.env.RZP_KEY_ID,
        password: process.env.RZP_KEY_SECRET,
      },
      headers: form.getHeaders()
    }
  );

  return response.data.id; // document_id
}

module.exports = { razorpay, createLinkedAccount, updateKyc, uploadDocument };



