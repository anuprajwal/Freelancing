const express = require("express");
const router = express.Router();
const { searchHospitalsBySurgery } = require("../controllers/traveling/getAllSurgeriesHospitals");
const protect = require("../middlewares/authMiddleware");
const createSurgeryRequest = require("../controllers/traveling/surgeryRequest");
const deleteSurgery = require('../controllers/traveling/deleteSurgery')
const getAllPlans = require("../controllers/traveling/getAllPlans")

// Route to search hospitals by surgery specialization
router.get("/search/hospitals", searchHospitalsBySurgery);

// User sends surgery request
router.post("/surgeries/request", protect, createSurgeryRequest);

router.delete("/surgeries/delete/:surgeryId", protect,deleteSurgery)

router.get('/get-plans', getAllPlans)

// Hospital admin views all surgery requests
// router.get("/hospital/requests", protect, getHospitalRequests);

// Hospital admin responds to a request
// router.post("/hospital/requests/:id/respond", protect, respondToSurgeryRequest);

module.exports = router;




