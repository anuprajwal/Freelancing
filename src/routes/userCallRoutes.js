const express = require("express");
const initialiseCall = require("../controllers/caller/initialiseCall")
const recieveCall = require('../controllers/caller/recieveCall')
const rejectCall = require('../controllers/caller/rejectCall')
const changeCallStatus = require('../controllers/caller/changeCallStatus')
const addOfferCandidates = require('../controllers/caller/addOfferCandidates')
const addAnswerCandidates = require('../controllers/caller/addAnswerCandidate');
const protect = require("../middlewares/authMiddleware");
const checkAccountStatus = require("../middlewares/accountCheck.js")

const router = express.Router();

// api url endpoint for initialising a call from user
router.post("/initialise-call", checkAccountStatus, protect, initialiseCall);

// api url endpoint for answering or recieving call which is already initialised
router.put("/recieve-call", checkAccountStatus, protect, recieveCall);

router.put("/reject-call", checkAccountStatus, protect, rejectCall)

// api url endpoint for changing call statuses like rejecting/holding/completing call
router.put("/change-call-status", checkAccountStatus, protect, changeCallStatus);

//api url endpoint for adding the offer candidates to the call.
//i.e the candidates coming from the user who initialised the call
router.post('/add-offer-candidates', checkAccountStatus, protect, addOfferCandidates)

//api url endpoint for adding the answer candidates to te call.
//i.e the candidates coming from the user who pick up the call.
router.post('/add-answer-candidates', checkAccountStatus, protect, addAnswerCandidates)

module.exports = router;
