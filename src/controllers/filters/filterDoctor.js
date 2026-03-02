// const {
//     doctorProfile,
//     address,
//     doctorSlots,
//     User
// } = require("../../../models");


// const filterDoctor = async (req, res) => {
//     // Extract pagination parameters along with specialization
//     const {
//         specialization
//     } = req.query;
//     const limit = parseInt(req.query.limit) || 4;
//     const offset = parseInt(req.query.offset) || 0;

//     try {
//         const doctors = await doctorProfile.findAll({
//             where: {
//                 ...(specialization ? {
//                     specialization
//                 } : {}),
//                 verified_status: true
//             },
//             // Apply pagination here
//             limit: limit,
//             offset: offset,
//             attributes: [
//                 "id", "user_id", "date_of_birth", "gender", "specialization",
//                 "experience_years", "consultation_fee", "organisation_id",
//                 "verified_status", "profile_picture", "appointment_time"
//             ],
//             include: [{
//                 model: User,
//                 as: "user",
//                 attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'],
//                 include: [{
//                         model: doctorSlots,
//                         as: "doctorSlots"
//                     },
//                     {
//                         model: address,
//                         as: "address"
//                     }
//                 ]
//             }]
//         });

//         return res.status(200).json({
//             doctors
//         });
//     } catch (error) {
//         console.log(`error found: ${error}`);
//         return res.status(500).json({
//             error: `Failed to filter doctor: ${error.message}`
//         });
//     }
// };
// module.exports = filterDoctor;


const {
    doctorProfile,
    address,
    doctorSlots,
    User
} = require("../../../models");
const {
    Op
} = require("sequelize");

const filterDoctor = async (req, res) => {
    // 1. Extract and sanitize query parameters
    const {
        specialization,
        pincode
    } = req.query;
    const limit = Math.max(1, parseInt(req.query.limit) || 4);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    try {
        // 2. Build the where clause for doctorProfile
        // Only include specialization if it is actually provided
        const doctorWhereClause = {
            verified_status: true
        };

        if (specialization && specialization.trim() !== "") {
            doctorWhereClause.specialization = specialization;
        }

        // 3. Define the address inclusion logic
        // If pincode is provided, we make the address requirement "required: true" 
        // to filter the main results (INNER JOIN behavior)
        const addressInclude = {
            model: address,
            as: "address",
            where: pincode ? {
                pincode: pincode
            } : {},
            required: !!pincode // If pincode exists, only return doctors with that pincode
        };

        // 4. Execute Query
        const {
            count,
            rows: doctors
        } = await doctorProfile.findAndCountAll({
            where: doctorWhereClause,
            limit: limit,
            offset: offset,
            distinct: true, // Prevents count issues when using includes with 1:M relationships
            attributes: [
                "id", "user_id", "date_of_birth", "gender", "specialization",
                "experience_years", "consultation_fee", "organisation_id",
                "verified_status", "profile_picture", "appointment_time"
            ],
            include: [{
                model: User,
                as: "user",
                attributes: ['phone_number', 'username', 'email', 'is_email_verified', 'is_phone_verified'],
                required: !!pincode, // If filtering by pincode, the User must exist and meet address criteria
                include: [{
                        model: doctorSlots,
                        as: "doctorSlots"
                    },
                    addressInclude
                ]
            }]
        });

        // 5. Robust Response handling
        if (doctors.length === 0) {
            return res.status(200).json({
                message: "No doctors found matching the criteria.",
                doctors: [],
                total: 0
            });
        }

        return res.status(200).json({
            total: count,
            limit,
            offset,
            doctors
        });

    } catch (error) {
        console.error(`[filterDoctor Error]: ${error}`);
        return res.status(500).json({
            error: "An internal server error occurred while filtering doctors."
        });
    }
};

module.exports = filterDoctor;