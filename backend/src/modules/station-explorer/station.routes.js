const express = require("express");
const StationController = require("./station.controller");

const router = express.Router();

router.get("/", async (req, res, next) => {
  const controller = new StationController(global.cmsConnection.db);
  return controller.searchStations(req, res, next);
});

router.get("/:stationId/chargers", async (req, res, next) => {
  const controller = new StationController(global.cmsConnection.db);
  return controller.getChargers(req, res, next);
});

module.exports = router;