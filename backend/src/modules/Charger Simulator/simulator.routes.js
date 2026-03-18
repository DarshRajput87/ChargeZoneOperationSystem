const express = require("express");
const router = express.Router();

const controller = require("./simulator.controller");

router.post("/connect", controller.connect);
router.post("/status", controller.sendStatus);

router.post("/start", controller.start);
router.post("/stop", controller.stop);

/* ✅ FIXED ROUTE */
router.post("/meter/values", controller.sendMeterValues);

/* ✅ LOGS ROUTE */
router.get("/logs", controller.getLogs);
router.delete("/logs", controller.clearLogs);

/* ✅ FAULT SCENARIO ROUTES */
router.get("/fault/list", controller.listFaults);
router.post("/fault/create", controller.createFault);
router.post("/fault/send", controller.sendFault);

module.exports = router;