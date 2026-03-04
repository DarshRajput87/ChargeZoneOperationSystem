const express = require("express");
const router = express.Router();
const controller = require("./inprogress.controller");

router.get("/", controller.getSessions);
router.get("/summary", controller.getSummary);

module.exports = router;