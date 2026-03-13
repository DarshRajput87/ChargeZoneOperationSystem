const express = require("express");
const controller = require("./faultyAnalysis.controller");

const router = express.Router();

router.get("/top-stations", controller.topStations);
router.get("/party-distribution", controller.partyDistribution);
router.get("/reasons", controller.reasons);
router.get("/city-heatmap", controller.cityHeatmap);
router.get("/trend", controller.trend);
router.get("/connector-reliability", controller.connectorReliability);
router.get("/recent", controller.recentFaults);
router.get("/station-health", controller.stationHealth);
router.get("/frequency", controller.frequency);

module.exports = router;