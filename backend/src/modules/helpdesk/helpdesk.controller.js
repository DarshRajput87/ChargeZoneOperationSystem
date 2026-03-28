const service = require("./helpdesk.service");

exports.getUsers = async (req, res, next) => {
    try {
        const data = await service.getHelpNeededUsers(req.query);
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

exports.getClosedUsers = async (req, res, next) => {
    try {
        const data = await service.getClosedUsers(req.query);
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

exports.updateAttendedBy = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { attendedBy } = req.body;

        await service.updateAttendedBy(id, attendedBy);

        res.status(200).json({ success: true, message: "Updated successfully" });
    } catch (err) {
        next(err);
    }
};

exports.updateTags = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { tags } = req.body;

        await service.updateTags(id, tags);

        res.status(200).json({ success: true, message: "Tags updated" });
    } catch (err) {
        next(err);
    }
};

exports.updateComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        await service.updateComment(id, comment);

        res.status(200).json({ success: true, message: "Comment updated" });
    } catch (err) {
        next(err);
    }
};

exports.closeTicket = async (req, res, next) => {
    try {
        const { id } = req.params;

        await service.closeTicket(id);

        res.status(200).json({ success: true, message: "Ticket closed" });
    } catch (err) {
        next(err);
    }
};