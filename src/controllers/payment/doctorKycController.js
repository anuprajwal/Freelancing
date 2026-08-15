// controllers/payment/doctorKycController.js

const {
  createLinkedAccount,
  createStakeholder,
  attachRouteProduct,
  updateSettlements,
  fetchAccount,
} = require("../../services/rzpService");

const { doctorProfile, User } = require("../../../models");

/* ---------------------------------------------------
   START ONBOARDING
----------------------------------------------------*/
exports.startOnboarding = async (req, res) => {
  try {
    const doctor = await doctorProfile.findOne({
      where: { user_id: req.params.id },
      include: [{ model: User, as: "user" }],
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
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

    // -------- Basic Validation --------
    if (
      !legal_business_name ||
      !contact_name ||
      !business_type ||
      !address_line1 ||
      !city ||
      !state ||
      !postal_code ||
      !business_pan ||
      !personal_pan
    ) {
      return res.status(400).json({
        message: "Missing required onboarding fields",
      });
    }

    // -------- 1. Create Linked Account --------
    if (!doctor.rzp_account_id) {
      const account = await createLinkedAccount({
        reference_id: `vendor_${doctor.id}`,
        email: doctor.user.email,
        phone: doctor.user.phone_number,
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
      });

      doctor.rzp_account_id = account.id;
      await doctor.save();
    }

    // -------- 2. Create Stakeholder --------
    if (!doctor.stakeholder_id) {
      const stakeholder = await createStakeholder(
        doctor.rzp_account_id,
        {
          name: contact_name,
          email: doctor.user.email,
          address_line1,
          city,
          state,
          postal_code,
          personal_pan,
        }
      );

      doctor.stakeholder_id = stakeholder.id;
      await doctor.save();
    }

    // -------- 3. Attach Route Product --------
    if (!doctor.product_id) {
      const product = await attachRouteProduct(doctor.rzp_account_id);
      doctor.product_id = product.id;
      await doctor.save();
    }

    // -------- 4. Update Settlement Details --------
    if (beneficiary_name && account_number && ifsc_code) {
      await updateSettlements(
        doctor.rzp_account_id,
        doctor.product_id,
        {
          beneficiary_name,
          account_number,
          ifsc_code,
        }
      );

      doctor.beneficiary_name = beneficiary_name;
      doctor.account_number = account_number;
      doctor.ifsc_code = ifsc_code;
      await doctor.save();
    }

    return res.json({
      success: true,
      account_id: doctor.rzp_account_id,
      stakeholder_id: doctor.stakeholder_id,
      product_id: doctor.product_id,
    });
  } catch (err) {
    console.error("Onboarding Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "Onboarding failed",
      error: err.response?.data || err.message,
    });
  }
};

/* ---------------------------------------------------
   FETCH ONBOARDING STATUS
----------------------------------------------------*/
exports.getOnboardingStatus = async (req, res) => {
  try {
    const doctor = await doctorProfile.findByPk(req.params.id);

    if (!doctor?.rzp_account_id) {
      return res.status(400).json({
        message: "Doctor not onboarded yet",
      });
    }

    const account = await fetchAccount(doctor.rzp_account_id);

    return res.json({
      success: true,
      account,
    });
  } catch (err) {
    console.error("Fetch Account Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "Failed to fetch onboarding status",
    });
  }
};

