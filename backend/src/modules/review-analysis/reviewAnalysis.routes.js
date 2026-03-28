const express = require("express");
const router = express.Router();
const controller = require("./reviewAnalysis.controller");

router.get("/", controller.getReviewAnalysis);

module.exports = router;