const express = require("express");
const router = express.Router();
const controller = require("./helpdesk.controller");

router.get("/", controller.getUsers);
router.get("/closed", controller.getClosedUsers);

router.patch("/:id/attended", controller.updateAttendedBy);
router.patch("/:id/tags", controller.updateTags);
router.patch("/:id/comment", controller.updateComment);
router.patch("/:id/close", controller.closeTicket);

module.exports = router;