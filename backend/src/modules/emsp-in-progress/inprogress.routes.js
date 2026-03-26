const express = require("express");
const router = express.Router();
const controller = require("./inprogress.controller");

router.get("/", controller.getSessions);
router.get("/summary", controller.getSummary);
router.post("/script-push", controller.scriptPush);

module.exports = router;