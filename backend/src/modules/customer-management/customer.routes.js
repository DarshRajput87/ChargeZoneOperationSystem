const express = require("express");
const controller = require("./customer.controller");

const router = express.Router();

// 🔍 Search user (phone / _id)
router.get("/search", controller.searchUsers);

// 👤 Full user detail
router.get("/:userId", controller.getUserDetails);

// 📊 User Segment
router.get("/user-segment/:userId", controller.getUserSegment);


module.exports = router;