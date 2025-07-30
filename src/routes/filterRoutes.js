const express = require("express");
const  filterHospitals  = require("../controllers/filters/filterHospitals.js");
const  filterDoctor  = require("../controllers/filters/filterDoctor.js");

const router = express.Router();

router.get("/filter-hospitals", filterHospitals);
router.get("/filter-doctors", filterDoctor);




module.exports = router;


