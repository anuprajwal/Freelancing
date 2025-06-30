const express = require("express");
const initialiseCall = require("../controllers/caller/initialiseCall")
const recieveCall = require('../controllers/caller/recieveCall')
const changeCallStatus = require('../controllers/caller/changeCallStatus')
const addOfferCandidates = require('../controllers/caller/addOfferCandidates')
const addAnswerCandidates = require('../controllers/caller/addAnswerCandidate');
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

// api url endpoint for initialising a call from user
router.post("/initialise-call", protect, initialiseCall);

// api url endpoint for answering or recieving call which is already initialised
router.put("/recieve-call", protect, recieveCall);

// api url endpoint for changing call statuses like rejecting/holding/completing call
router.put("/change-call-status", protect, changeCallStatus);

//api url endpoint for adding the offer candidates to the call.
//i.e the candidates coming from the user who initialised the call
router.post('/add-offer-candidates', protect, addOfferCandidates)

//api url endpoint for adding the answer candidates to te call.
//i.e the candidates coming from the user who pick up the call.
router.post('/add-answer-candidates', protect, addAnswerCandidates)

module.exports = router;
