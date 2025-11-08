const express = require("express");
const filterHospitals  = require("../controllers/filters/filterHospitals.js");
const filterDoctor  = require("../controllers/filters/filterDoctor.js");
const filterDoctorByLocation = require("../controllers/filters/filterDoctorsByLocation.js")
const filterHospitalsByLocation = require("../controllers/filters/filterHospitalByLocation.js")
const getDoctorsByOrganisation = require("../controllers/appointment/hospital/getDoctorsFromHospital.js")

const router = express.Router();

router.get("/filter-hospitals", filterHospitals);
router.get("/filter-doctors", filterDoctor);
router.get("/filter-docs-by-loc", filterDoctorByLocation)
router.get("/filter-hptls-by-loc", filterHospitalsByLocation)
router.get("/get-hospital-doctors/:organisation_id", getDoctorsByOrganisation)




module.exports = router;