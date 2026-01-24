const {
    doctorProfile,
    organisationProfile
} = require("../../../models");
// const logger = require("../../../logger");

const uploadBankDetails = async (req, res) => {

    const {
        id,
        scope
    } = req.user.payload;

    //   logger.info(`Bank details upload request by user: ${id} with role: ${role}`);

    const {
        account_number,
        beneficiary_name,
        ifsc_code
    } = req.body;

    console.log(req.body)

    console.log("wfs", account_number, beneficiary_name, ifsc_code)

    // Input validation
    if (!account_number || !beneficiary_name || !ifsc_code) {
        // logger.warn(`Missing required bank fields by user: ${id}`);
        return res.status(400).json({
            error: "All fields are required"
        });
    }
    console.log("jdskcnweilmk")

    if (account_number.length < 6) {
        return res.status(400).json({
            error: "Invalid account number"
        });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
        return res.status(400).json({
            error: "Invalid IFSC code format"
        });
    }

    try {
        let updateModel;

        if (scope === "doctor") {
            updateModel = doctorProfile;
        } else if (scope === "hospital_organisation") {
            updateModel = organisationProfile;
        } else {
            //   logger.warn(`User ${id} is not allowed to upload bank details`);
            return res.status(403).json({
                error: "Only doctor or hospital organisation can add bank details"
            });
        }

        // Update bank details in correct model
        await updateModel.update({
            account_number,
            beneficiary_name,
            ifsc_code
        }, {
            where: {
                user_id: id
            }
        });

        // logger.info(`Bank details updated successfully for user: ${id}`);
        return res.status(200).json({
            message: "Bank details uploaded successfully"
        });

    } catch (error) {
        // logger.error(`Error uploading bank details for ${id}: ${error}`);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

const getBankDetails = async (req, res) => {
    const {
        id,
        scope
    } = req.user.payload;

    try {
        let fetchModel;

        if (scope === "doctor") {
            fetchModel = doctorProfile;
        } else if (scope === "hospital_organisation") {
            fetchModel = organisationProfile;
        } else {
            return res.status(403).json({
                error: "Only doctor or hospital organisation can view bank details"
            });
        }

        const bankDetails = await fetchModel.findOne({
            where: {
                user_id: id
            },
            attributes: [
                "account_number",
                "beneficiary_name",
                "ifsc_code"
            ]
        });

        // 🟡 Fresh user / bank details not set yet
        if (!bankDetails || !bankDetails.account_number) {
            return res.status(200).json({
                bankDetails: null,
                message: "Bank details not added yet"
            });
        }

        return res.status(200).json({
            bankDetails: {
                account_number: bankDetails.account_number,
                beneficiary_name: bankDetails.beneficiary_name,
                ifsc_code: bankDetails.ifsc_code
            }
        });

    } catch (error) {
        // logger.error(`Error fetching bank details for ${id}: ${error}`);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


module.exports = {
    uploadBankDetails,
    getBankDetails
};