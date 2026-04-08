const express = require("express");
const router = express.Router();

const segmentsRouter = require("./segments");
const segmentUsersRouter = require("./segmentUsers");
const metricsRouter = require("./metrics");
const compareRouter = require("./compare");

router.use("/segments", segmentsRouter);
router.use("/segments", segmentUsersRouter);
router.use("/metrics", metricsRouter);   // ✅ was already here but missing in actual registration
router.use("/compare", compareRouter);   // ✅ same

module.exports = router;