const express = require("express");
const router = express.Router();
const controller = require("./settlement.controller");

router.get("/preview/:bookingId", controller.previewSettlement);
router.post("/push", controller.pushSettlement);

module.exports = router;