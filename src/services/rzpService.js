// services/rzpService.js
const axios = require("axios");

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
  throw new Error("Missing Razorpay credentials");
}

const auth = {
  username: RZP_KEY_ID,
  password: RZP_KEY_SECRET,
};

const BASE_V2 = process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com/v2";

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


/* -----------------------------------
   1. CREATE LINKED ACCOUNT
------------------------------------ */
async function createLinkedAccount(data) {
  const payload = {
    type: "route",
    reference_id: data.reference_id,
    email: data.email,
    phone: data.phone,
    legal_business_name: data.legal_business_name,
    contact_name: data.contact_name,
    business_type: data.business_type,

    profile: {
      category: "healthcare",
      subcategory: data.subcategory,
      addresses: {
        registered: {
          street1: data.address_line1,
          street2: data.address_line2 || "NA",
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: "IN",
        },
      },
    },

    legal_info: {
      pan: data.business_pan,
      ...(data.gst_number && { gst: data.gst_number }),
    },
  };

  const resp = await axios.post(`${BASE_V2}/accounts`, payload, { auth });
  return resp.data;
}

/* -----------------------------------
   2. CREATE STAKEHOLDER
------------------------------------ */
async function createStakeholder(accountId, data) {
  const payload = {
    name: data.name,
    email: data.email,
    addresses: {
      residential: {
        street: data.address_line1,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: "IN",
      },
    },
    kyc: {
      pan: data.personal_pan,
    },
  };

  const resp = await axios.post(
    `${BASE_V2}/accounts/${accountId}/stakeholders`,
    payload,
    { auth }
  );

  return resp.data;
}

/* -----------------------------------
   3. ATTACH ROUTE PRODUCT
------------------------------------ */
async function attachRouteProduct(accountId) {
  const resp = await axios.post(
    `${BASE_V2}/accounts/${accountId}/products`,
    {
      product_name: "route",
      tnc_accepted: true,
    },
    { auth }
  );

  return resp.data;
}

/* -----------------------------------
   4. UPDATE SETTLEMENT DETAILS
------------------------------------ */
async function updateSettlements(accountId, productId, bankDetails) {
  const payload = {
    settlements: {
      beneficiary_name: bankDetails.beneficiary_name,
      account_number: bankDetails.account_number,
      ifsc_code: bankDetails.ifsc_code,
    },
  };

  const resp = await axios.patch(
    `${BASE_V2}/accounts/${accountId}/products/${productId}`,
    payload,
    { auth }
  );

  return resp.data;
}

/* -----------------------------------
   5. FETCH ACCOUNT STATUS
------------------------------------ */
async function fetchAccount(accountId) {
  const resp = await axios.get(`${BASE_V2}/accounts/${accountId}`, { auth });
  return resp.data;
}

module.exports = {
  razorpay,
  createLinkedAccount,
  createStakeholder,
  attachRouteProduct,
  updateSettlements,
  fetchAccount,
};
