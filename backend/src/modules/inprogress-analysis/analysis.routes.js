const express = require("express");
const router = express.Router();

const controller = require("./analysis.controller");

router.get("/", controller.getAnalysis);

module.exports = router;