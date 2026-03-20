// src/modules/feedback/feedback.routes.js

const express = require("express");
const router = express.Router();
const controller = require("./feedback.controller");

router.get("/", controller.handleFeedback);

module.exports = router;