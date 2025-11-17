const express = require("express");

const addAddress=require("../controllers/address/addAddress")
const removeAddress=require("../controllers/address/removeAddress")
const updateAddress=require("../controllers/address/updateAddress")
const sendAddresses=require("../controllers/address/ShowAddress");
const updateLocation = require("../controllers/address/userLocation")
const protect = require("../middlewares/authMiddleware");
const checkAccountStatus = require("../middlewares/accountCheck")

const router = express.Router()

router.post("/addAddress", protect, checkAccountStatus,  addAddress)
router.get("/getAllAddress", protect, checkAccountStatus, sendAddresses)
router.put("/updateAddress", protect, checkAccountStatus,  updateAddress)
router.delete("/deleteAddress", protect, checkAccountStatus, removeAddress)
router.post("/update-location", protect, checkAccountStatus,  updateLocation)

module.exports =router