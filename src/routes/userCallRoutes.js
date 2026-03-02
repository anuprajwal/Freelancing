const express = require("express");
const initialiseCall = require("../controllers/caller/initialiseCall")
const recieveCall = require('../controllers/caller/recieveCall')
const rejectCall = require('../controllers/caller/rejectCall')
const changeCallStatus = require('../controllers/caller/changeCallStatus')
const addOfferCandidates = require('../controllers/caller/addOfferCandidates')
const addAnswerCandidates = require('../controllers/caller/addAnswerCandidate');
const getCallOffer = require("../controllers/caller/getOfferCandidates.js")
const protect = require("../middlewares/authMiddleware");
const checkAccountStatus = require("../middlewares/accountCheck.js")

const router = express.Router();

// api url endpoint for initialising a call from user
router.post("/initialise-call", protect, checkAccountStatus, initialiseCall);

// api url endpoint for answering or recieving call which is already initialised
router.put("/recieve-call", protect, checkAccountStatus, recieveCall);

router.put("/reject-call", protect, checkAccountStatus, rejectCall)

// api url endpoint for changing call statuses like rejecting/holding/completing call
router.put("/change-call-status", protect, checkAccountStatus, changeCallStatus);

//api url endpoint for adding the offer candidates to the call.
//i.e the candidates coming from the user who initialised the call
router.post('/add-offer-candidates', protect, checkAccountStatus, addOfferCandidates)
router.get('/get-call-offer', protect, checkAccountStatus, getCallOffer)
//api url endpoint for adding the answer candidates to te call.
//i.e the candidates coming from the user who pick up the call.
router.post('/add-answer-candidates', protect, checkAccountStatus, addAnswerCandidates)

module.exports = router;