const express = require("express");
const {filterHospitals, filterHospitalIdName}  = require("../controllers/filters/filterHospitals.js");
const filterDoctor  = require("../controllers/filters/filterDoctor.js");
const filterDoctorByLocation = require("../controllers/filters/filterDoctorsByLocation.js")
const filterHospitalsByLocation = require("../controllers/filters/filterHospitalByLocation.js")
const getDoctorsByOrganisation = require("../controllers/appointment/hospital/getDoctorsFromHospital.js")
const searchHospitals = require("../controllers/filters/searchHospitals.js")
const searchDoctors = require("../controllers/filters/searchDoctors.js")

const router = express.Router();

router.get("/filter-hospitals", filterHospitals);
router.get("/filter-doctors", filterDoctor);
router.get("/filter-docs-by-loc", filterDoctorByLocation)
router.get("/filter-hptls-by-loc", filterHospitalsByLocation)
router.get("/get-hospital-doctors/:organisation_id", getDoctorsByOrganisation)
router.get("/search/hospital-by-name", searchHospitals)
router.get("/search-doctor-name", searchDoctors)
router.get("/filter-hospital-id-name", filterHospitalIdName);




module.exports = router;