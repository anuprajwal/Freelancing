const express = require("express");

const addAddress=require("../controllers/address/addAddress")
const removeAddress=require("../controllers/address/removeAddress")
const updateAddress=require("../controllers/address/updateAddress")
const getActiveAddress=require("../controllers/address/ShowAddress")
const sendAddresses=require("../controllers/address/ShowAddress");
const protect = require("../middlewares/authMiddleware");

const router = express.Router()

router.post("/addAddress",protect, addAddress)
router.get("/getActiveAddress", protect, getActiveAddress)
router.get("/getAllAddress", protect,sendAddresses)
router.put("/updateAddress", protect, updateAddress)
router.delete("/deleteAddress", protect,removeAddress)

module.exports =router