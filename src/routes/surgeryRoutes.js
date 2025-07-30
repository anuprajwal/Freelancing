const express = require("express");
const router = express.Router();
const { searchHospitalsBySurgery } = require("../controllers/traveling/getAllSurgeries");
const protect = require("../middlewares/authMiddleware");
const {
  createSurgeryRequest
  // getHospitalRequests,
  // respondToSurgeryRequest
} = require("../controllers/traveling/surgeryRequest");

// Route to search hospitals by surgery specialization
router.get("/search/hospitals", protect, searchHospitalsBySurgery);

// User sends surgery request
router.post("/surgeries/request", protect, createSurgeryRequest);

// Hospital admin views all surgery requests
// router.get("/hospital/requests", protect, getHospitalRequests);

// Hospital admin responds to a request
// router.post("/hospital/requests/:id/respond", protect, respondToSurgeryRequest);

module.exports = router;




