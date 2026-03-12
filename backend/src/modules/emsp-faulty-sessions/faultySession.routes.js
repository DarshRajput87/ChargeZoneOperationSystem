const express = require("express");
const router = express.Router();

const {
    getFaultySessions,
    getSummary
} = require("./faultySession.controller");

router.get("/", getFaultySessions);
router.get("/summary", getSummary);

module.exports = router;