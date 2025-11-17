const express = require("express");

const addAddress=require("../controllers/address/addAddress")
const removeAddress=require("../controllers/address/removeAddress")
const updateAddress=require("../controllers/address/updateAddress")
const sendAddresses=require("../controllers/address/ShowAddress");
const updateLocation = require("../controllers/address/userLocation")
const protect = require("../middlewares/authMiddleware");
const checkAccountStatus = require("../middlewares/accountCheck")

const router = express.Router()

router.post("/addAddress", checkAccountStatus,protect, addAddress)
router.get("/getAllAddress", checkAccountStatus, protect,sendAddresses)
router.put("/updateAddress", checkAccountStatus, protect, updateAddress)
router.delete("/deleteAddress", checkAccountStatus, protect,removeAddress)
router.post("/update-location", checkAccountStatus, protect, updateLocation)

module.exports =router