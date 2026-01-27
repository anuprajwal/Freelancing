// services/rzpService.js
const Razorpay = require("razorpay");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
if (!RZP_KEY_ID || !RZP_KEY_SECRET) throw new Error("Missing RZP_KEY_ID / RZP_KEY_SECRET env vars");

const razorpay = new Razorpay({
    key_id: RZP_KEY_ID,
    key_secret: RZP_KEY_SECRET,
});

const auth = {
    username: RZP_KEY_ID,
    password: RZP_KEY_SECRET
};
const BASE_V1 = "https://api.razorpay.com/v1";
const BASE_V2 = "https://api.razorpay.com/v2";

/**
 * Upload file to Razorpay Files API
 * purpose: 'pan' | 'bank_account' | 'address' (Razorpay accepted purposes)
 * returns file id (string)
 */
async function uploadDocument(filePath, purpose) {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("purpose", purpose);

    const resp = await axios.post(`${BASE_V1}/files`, form, {
        auth,
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    return resp.data.id;
}

/**
 * Create a linked account (Route)
 * doctor: doctorProfile instance (with .user)
 * returns account object from RZP
 */
async function createLinkedAccount(doctor) {
    // Use SDK create account (v1)
    const payload = {
        email: (doctor.user && doctor.user.email) || undefined,
        phone: (doctor.user && doctor.user.phone_number) || undefined,
        type: "route",
        legal_business_name: "business name",
        business_type: "medical",
        profile: {
            category: "healthcare",
            subcategory: "doctor",
            addresses: {
                street1: [doctor.address_line1 || "NA"],
                postal_code: doctor.pincode || "000000",
            }
        }


    };
    return await razorpay.accounts.create(payload);
}

/**
 * Create stakeholder (v1)
 * accountId: rzp account id
 * stakeholderData: per Razorpay docs
 * returns stakeholder object
 */
async function createStakeholder(accountId, stakeholderData) {
    const url = `${BASE_V1}/accounts/${accountId}/stakeholders`;
    const resp = await axios.post(url, stakeholderData, {
        auth
    });
    return resp.data;
}

/**
 * Request Route product config (v1)
 * accountId: rzp account id
 * returns product object (id)
 */
async function requestProductConfig(accountId) {
    const url = `${BASE_V1}/accounts/${accountId}/route_products`;
    const resp = await axios.post(url, {}, {
        auth
    });
    return resp.data;
}

/**
 * Update product config with bank details (v1)
 * accountId, productId, bankDetails: { account_number, ifsc, beneficiary_name }
 * returns updated product
 */
async function updateProductConfig(accountId, productId, bankDetails) {
    const url = `${BASE_V1}/accounts/${accountId}/route_products/${productId}`;
    const resp = await axios.patch(url, bankDetails, {
        auth
    });
    return resp.data;
}

/**
 * Update account KYC using SDK (v1). This attaches PAN/bank/address details (with file ids).
 * accountId: rzp_account_id
 * kycData: { pan_number, pan_doc_id, bank_doc_id, ifsc, account_number, address_doc_id, address_line1 }
 * returns updated account object
 */
async function updateKyc(accountId, kycData) {
    const payload = {
        kyc: {
            pan: {
                number: kycData.pan_number,
                document_id: kycData.pan_doc_id,
            },
            bank_account: {
                ifsc: kycData.ifsc,
                account_number: kycData.account_number,
                document_id: kycData.bank_doc_id,
            },
            address: {
                line1: kycData.address_line1,
                document_id: kycData.address_doc_id,
            },
        },
    };
    return await razorpay.accounts.update(accountId, payload);
}

/**
 * Create Order with transfers[] (best practice: create transfers array on order).
 * - amount: rupees (number)
 * - receipt: string
 * - notes: object
 * - doctorProfile: doctor DB instance (must have rzp_account_id)
 *
 * Behavior:
 *  - If EXPLICIT_PLATFORM_TRANSFER=true AND COMPANY_RZP_ACCOUNT_ID is set,
 *      create transfers for doctor + company.
 *  - Else create transfer for doctor only and let Razorpay deduct the platform fee.
 *
 * Returns { order, transfers } where order is Razorpay order object.
 */
async function createOrderWithTransfers({
    amount,
    receipt,
    notes = {},
    doctorProfile
}) {
    if (!doctorProfile) throw new Error("doctorProfile required");
    const linkedAccountId = doctorProfile.rzp_account_id;
    if (!linkedAccountId) throw new Error("Doctor not onboarded: missing rzp_account_id");

    const joinedAt = doctorProfile.joined_at ? new Date(doctorProfile.joined_at) : null;
    const now = new Date();
    let months = 999;
    if (joinedAt) months = (now.getFullYear() - joinedAt.getFullYear()) * 12 + (now.getMonth() - joinedAt.getMonth());

    const companySharePct = months < 2 ? 0.10 : 0.30;
    const doctorSharePct = 1 - companySharePct;

    // amounts in paise
    const totalPaise = Math.round(Number(amount) * 100);
    const doctorPaise = Math.floor(totalPaise * doctorSharePct);
    const platformPaise = totalPaise - doctorPaise; // remainder to platform

    const transfers = [];
    // Doctor transfer (required)
    transfers.push({
        account: linkedAccountId,
        amount: doctorPaise,
        currency: "INR",
        on_hold: false,
        // fee_bearer: "recipient" // not necessary when using Route transfers via order; we leave default
        notes: {
            doctor_id: doctorProfile.id,
            ...notes
        },
    });

    // Optional explicit platform transfer
    if (process.env.EXPLICIT_PLATFORM_TRANSFER === "true" && process.env.COMPANY_RZP_ACCOUNT_ID) {
        transfers.push({
            account: process.env.COMPANY_RZP_ACCOUNT_ID,
            amount: platformPaise,
            currency: "INR",
            on_hold: false,
            notes: {
                platform: "docapp",
                ...notes
            },
        });
    }

    const orderPayload = {
        amount: totalPaise,
        currency: "INR",
        receipt,
        partial_payment: false,
        notes,
        transfers,
    };

    const order = await razorpay.orders.create(orderPayload);
    return {
        order,
        transfers,
        doctorPaise,
        platformPaise
    };
}

module.exports = {
    razorpay,
    uploadDocument,
    createLinkedAccount,
    createStakeholder,
    requestProductConfig,
    updateProductConfig,
    updateKyc,
    createOrderWithTransfers,
};