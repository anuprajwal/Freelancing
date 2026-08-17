// controllers/payment/hospitalKycController.js

const {
  createLinkedAccount,
  createStakeholder,
  attachRouteProduct,
  updateSettlements,
  fetchAccount,
} = require("../../services/rzpService");

const { organisationProfile, User } = require("../../../models");

/* ---------------------------------------------------
   START HOSPITAL ONBOARDING
----------------------------------------------------*/
exports.startOnboardingHospital = async (req, res) => {
  try {
    // Dual lookup strategy: checks user_id first, falls back to primary key
    let hospital = await organisationProfile.findOne({
      where: { user_id: req.params.id },
      include: [{ model: User, as: "user" }],
    });

    if (!hospital) {
      hospital = await organisationProfile.findByPk(req.params.id, {
        include: [{ model: User, as: "user" }],
      });
    }

    if (!hospital) {
      return res.status(404).json({ message: "Hospital profile record not found" });
    }

    const {
      legal_business_name,
      contact_name,
      business_type,
      subcategory,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      business_pan,
      gst_number,
      personal_pan,
      beneficiary_name,
      account_number,
      ifsc_code,
    } = req.body;

    const isIndividual = business_type === "individual";

    if (
      !legal_business_name ||
      !contact_name ||
      !business_type ||
      !address_line1 ||
      !city ||
      !state ||
      !postal_code ||
      !personal_pan ||
      (!isIndividual && !business_pan)
    ) {
      return res.status(400).json({
        message: "Missing required onboarding fields",
      });
    }

    // -------- 1. Create Linked Account --------
    if (!hospital.rzp_account_id) {
      const account = await createLinkedAccount({
        reference_id: `hospital_${hospital.id}`,
        email: hospital.user?.email,
        phone: hospital.user?.phone_number,
        legal_business_name,
        contact_name,
        business_type,
        subcategory: subcategory || "healthcare",
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        business_pan: isIndividual ? null : business_pan,
        gst_number,
      });

      hospital.rzp_account_id = account.id;
      hospital.kyc_status = "pending";
      await hospital.save();
    }

    // -------- 2. Create Stakeholder --------
    if (!hospital.stakeholder_id) {
      const stakeholder = await createStakeholder(
        hospital.rzp_account_id,
        {
          name: contact_name,
          email: hospital.user?.email,
          address_line1,
          city,
          state,
          postal_code,
          personal_pan,
        }
      );

      hospital.stakeholder_id = stakeholder.id;
      await hospital.save();
    }

    // -------- 3. Attach Route Product --------
    if (!hospital.product_id) {
      const product = await attachRouteProduct(hospital.rzp_account_id);
      hospital.product_id = product.id;
      await hospital.save();
    }

    // -------- 4. Update Settlement Details --------
    if (beneficiary_name && account_number && ifsc_code) {
      await updateSettlements(
        hospital.rzp_account_id,
        hospital.product_id,
        {
          beneficiary_name,
          account_number,
          ifsc_code,
        }
      );

      hospital.beneficiary_name = beneficiary_name;
      hospital.account_number = account_number;
      hospital.ifsc_code = ifsc_code;
      await hospital.save();
    }

    return res.json({
      success: true,
      account_id: hospital.rzp_account_id,
      stakeholder_id: hospital.stakeholder_id,
      product_id: hospital.product_id,
      kyc_status: hospital.kyc_status,
    });
  } catch (err) {
    console.error("Hospital Onboarding Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "Hospital onboarding failed",
      error: err.response?.data || err.message,
    });
  }
};

/* ---------------------------------------------------
   FETCH ONBOARDING STATUS
----------------------------------------------------*/
exports.getOnboardingStatus = async (req, res) => {
  try {
    let hospital = await organisationProfile.findOne({
      where: { user_id: req.params.id },
    });

    if (!hospital) {
      hospital = await organisationProfile.findByPk(req.params.id);
    }

    if (!hospital?.rzp_account_id) {
      return res.status(400).json({
        message: "Hospital not onboarded yet",
      });
    }

    const account = await fetchAccount(hospital.rzp_account_id);

    return res.json({
      success: true,
      account,
      kyc_status: hospital.kyc_status || account?.kyc?.status || "pending",
    });
  } catch (err) {
    console.error("Fetch Hospital Account Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "Failed to fetch hospital onboarding status",
    });
  }
};