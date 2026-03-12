const express = require("express");

const router = express.Router();

const {
    getFaultySessions,
    getSummary,
    pushFaultySession
} = require("./faultySession.controller");

router.get("/", getFaultySessions);
router.get("/summary", getSummary);
router.post("/push/:bookingId", pushFaultySession);

module.exports = router;