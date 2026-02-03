// controllers/payment/doctorKycController.js
const {
  createLinkedAccount,
  createStakeholder,
  attachRouteProduct,
  updateSettlements,
  fetchAccount,
} = require("../../services/rzpService");

const { doctorProfile, User } = require("../../../models");

exports.startOnboarding = async (req, res) => {
  try {
    const doctor = await doctorProfile.findByPk(req.params.id, {
      include: [{ model: User, as: "user" }],
    });

    if (!doctor) return res.status(404).json({ message: "Not found" });

    if (!doctor.rzp_account_id) {
      const account = await createLinkedAccount(doctor);
      doctor.rzp_account_id = account.id;
      await doctor.save();
    }

    if (!doctor.stakeholder_id) {
      const stakeholder = await createStakeholder(
        doctor.rzp_account_id,
        doctor
      );
      doctor.stakeholder_id = stakeholder.id;
      await doctor.save();
    }

    if (!doctor.product_id) {
      const product = await attachRouteProduct(doctor.rzp_account_id);
      doctor.product_id = product.id;
      await doctor.save();
    }

    if (
      doctor.account_number &&
      doctor.ifsc_code &&
      doctor.beneficiary_name
    ) {
      await updateSettlements(
        doctor.rzp_account_id,
        doctor.product_id,
        doctor
      );
    }

    return res.json({
      account_id: doctor.rzp_account_id,
      stakeholder_id: doctor.stakeholder_id,
      product_id: doctor.product_id,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Onboarding failed" });
  }
};

exports.getOnboardingStatus = async (req, res) => {
  const doctor = await doctorProfile.findByPk(req.params.id);
  if (!doctor?.rzp_account_id)
    return res.status(400).json({ message: "Not onboarded" });

  const account = await fetchAccount(doctor.rzp_account_id);
  return res.json(account);
};
