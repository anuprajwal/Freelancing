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

const BASE_V2 = "https://api.razorpay.com/v2";

/* -----------------------------
   1. CREATE LINKED ACCOUNT
------------------------------*/
async function createLinkedAccount(vendor) {
  const payload = {
    type: "route",
    reference_id: `vendor_${vendor.id}`,
    email: vendor.user.email,
    phone: vendor.user.phone_number,
    legal_business_name: vendor.legal_business_name,
    contact_name: vendor.user.full_name,
    business_type: vendor.legal_entity_type, // dynamic
    profile: {
      category: "healthcare",
      subcategory: mapSubcategory(vendor.vendor_type),
      addresses: {
        registered: {
          street1: vendor.address_line1,
          street2: vendor.address_line2 || "NA",
          city: vendor.city,
          state: vendor.state,
          postal_code: vendor.pincode,
          country: "IN",
        },
      },
    },
    legal_info: {
      pan: vendor.business_pan,
    },
  };

  const resp = await axios.post(`${BASE_V2}/accounts`, payload, { auth });
  return resp.data;
}

/* -----------------------------
   2. CREATE STAKEHOLDER
------------------------------*/
async function createStakeholder(accountId, vendor) {
  const payload = {
    name: vendor.user.full_name,
    email: vendor.user.email,
    addresses: {
      residential: {
        street: vendor.address_line1,
        city: vendor.city,
        state: vendor.state,
        postal_code: vendor.pincode,
        country: "IN",
      },
    },
    kyc: {
      pan: vendor.personal_pan,
    },
  };

  const resp = await axios.post(
    `${BASE_V2}/accounts/${accountId}/stakeholders`,
    payload,
    { auth }
  );

  return resp.data;
}

/* -----------------------------
   3. ATTACH ROUTE PRODUCT
------------------------------*/
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

/* -----------------------------
   4. UPDATE SETTLEMENT DETAILS
------------------------------*/
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

/* -----------------------------
   5. FETCH ACCOUNT STATUS
------------------------------*/
async function fetchAccount(accountId) {
  const resp = await axios.get(`${BASE_V2}/accounts/${accountId}`, { auth });
  return resp.data;
}

/* -----------------------------
   HELPERS
------------------------------*/
function mapSubcategory(vendorType) {
  switch (vendorType) {
    case "doctor":
      return "clinic";
    case "clinic":
      return "clinic";
    case "hospital":
      return "hospital";
    default:
      return "clinic";
  }
}

module.exports = {
  createLinkedAccount,
  createStakeholder,
  attachRouteProduct,
  updateSettlements,
  fetchAccount,
};
