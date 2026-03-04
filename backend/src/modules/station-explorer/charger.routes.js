const express = require("express");
const router = express.Router();
const controller = require("./charger.controller");

router.get("/", controller.getChargers);

module.exports = router;