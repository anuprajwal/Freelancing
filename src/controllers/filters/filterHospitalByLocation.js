const { literal, Op } = require("sequelize");
const { User, organisationProfile } = require("../../../models");

const filterHospitalsByLocation = async (req, res) => {
    try {
        const userLatitude = parseFloat(req.query.userLatitude) || null;
        const userLongitude = parseFloat(req.query.userLongitude) || null;

        if (!userLatitude || !userLongitude) {
            return res.status(400).json({ error: "Cannot find the user location" });
        }

        const filterInMeters = parseInt(req.query.filterInMeters) || 5000;

        // MySQL 8.0 compatible spatial expression for distance in meters
        const distanceFormula = `
            ST_Distance_Sphere(
                Point(longitude, latitude),
                Point(${userLongitude}, ${userLatitude})
            )
        `;

        const hospitals = await User.findAll({
            attributes: {
                include: [
                    [literal(distanceFormula), "distance"]
                ]
            },
            include: [
                {
                    model: organisationProfile,
                    as: "organisationProfile",
                    attributes: [
                        "id",
                        "consultation_fee", 
                        "specializations_provided", 
                        "profile_picture", 
                    ],
                    where: {
                        verified_status: "approved"
                    }
                }
            ],
            where: {
                role: "doctor",
                // Use literal inside Op.and to safely pass custom SQL conditions in MySQL
                [Op.and]: [
                    literal(`${distanceFormula} <= ${filterInMeters}`)
                ]
            },
            order: literal(distanceFormula)
        });

        console.log(hospitals);

        return res.status(200).json({ 
            message: "Successful", 
            data: hospitals 
        });

    } catch (error) {
        console.error("Error filtering hospitals:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = filterHospitalsByLocation;