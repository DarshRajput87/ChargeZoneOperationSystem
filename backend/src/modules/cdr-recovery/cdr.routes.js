const express = require("express");
const router = express.Router();
const controller = require("./cdr.controller");

router.get("/build/:bookingId", controller.buildCDR);

module.exports = router;