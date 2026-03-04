const express = require("express");
const router = express.Router();
const { getMetrics } = require("./dashboard.controller");

router.get("/metrics", getMetrics);

module.exports = router;