const express = require("express");
const  filterHospitals  = require("../controllers/filters/filterHospitals.js");
const  filterDoctor  = require("../controllers/filters/filterDoctor.js");
const  protect  = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.get("/filter-hospitals", protect, filterHospitals);
router.get("/filter-doctors", protect, filterDoctor);




module.exports = router;


