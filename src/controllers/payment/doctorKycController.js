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
    // HERE THERE IS A CHANGE MADE:
    // Dual lookup strategy: looks up by user_id first, then falls back to primary key
    let doctor = await doctorProfile.findOne({
      where: { user_id: req.params.id },
      include: [{ model: User, as: "user" }],
    });

    if (!doctor) {
      doctor = await doctorProfile.findByPk(req.params.id, {
        include: [{ model: User, as: "user" }],
      });
    }

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

    const isIndividual = business_type === "individual";

    // HERE THERE IS A CHANGE MADE:
    // business_pan is only mandatory if business_type is NOT "individual".
    // For individuals, personal_pan is the required identifier.
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
        business_pan: isIndividual ? null : business_pan, // Omit company PAN for individual
        gst_number,
      });

      doctor.rzp_account_id = account.id;
      // HERE THERE IS A CHANGE MADE: Set status to pending on initial creation
      doctor.kyc_status = "pending";
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
      kyc_status: doctor.kyc_status,
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
    // HERE THERE IS A CHANGE MADE: Dual lookup strategy
    let doctor = await doctorProfile.findOne({
      where: { user_id: req.params.id },
    });

    if (!doctor) {
      doctor = await doctorProfile.findByPk(req.params.id);
    }

    if (!doctor?.rzp_account_id) {
      return res.status(401).json({
        message: "Doctor not onboarded yet",
      });
    }

    const account = await fetchAccount(doctor.rzp_account_id);

    return res.json({
      success: true,
      account,
      kyc_status: doctor.kyc_status,
    });
  } catch (err) {
    console.error("Fetch Account Error:", err.response?.data || err.message);
    return res.status(500).json({
      message: "Failed to fetch onboarding status",
    });
  }
};