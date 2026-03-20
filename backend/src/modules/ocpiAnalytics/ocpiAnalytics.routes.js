const express = require("express");
const router = express.Router();
const controller = require("./ocpiAnalytics.controller");

router.get("/summary", controller.summary);
router.get("/modules", controller.modules);
router.get("/partners", controller.partners);
router.get("/failures", controller.failures);
router.get("/logs", controller.logs);
router.get("/all-parties", controller.allParties);
router.get("/tenants", controller.tenants);

module.exports = router;