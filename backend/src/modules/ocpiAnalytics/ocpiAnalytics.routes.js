const express = require("express");
const router = express.Router();
const controller = require("./ocpiAnalytics.controller");

router.get("/dashboard-stats", controller.dashboardStats);
router.get("/time-series", controller.timeSeriesStats);
router.get("/party-time-series", controller.partyTimeSeriesStats);
router.get("/logs", controller.logs);
router.get("/all-parties", controller.allParties);
router.get("/tenants", controller.tenants);

module.exports = router;