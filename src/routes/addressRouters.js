const express = require("express");

const addAddress = require("../controllers/address/addAddress")
const removeAddress = require("../controllers/address/removeAddress")
const updateAddress = require("../controllers/address/updateAddress")
const sendAddresses = require("../controllers/address/ShowAddress");
const updateLocation = require("../controllers/address/userLocation")
const protect = require("../middlewares/authMiddleware");

const router = express.Router()

router.post("/addAddress", protect, addAddress)
router.get("/getAllAddress", protect, sendAddresses)
router.put("/updateAddress", protect, updateAddress)
router.delete("/deleteAddress", protect, removeAddress)
router.post("/update-location", protect, updateLocation)

module.exports = router