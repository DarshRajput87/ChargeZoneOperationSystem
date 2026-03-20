// src/modules/feedback/feedback.service.js

const Model = require("./customerFeedback.model"); // adjust path if needed

exports.saveFeedback = async (mobile, type) => {
    const user = await Model.findOne({ mobile });

    if (!user) {
        return { status: false, message: "User not found" };
    }

    user.HelpNeeded = type;
    user.helpResponseAt = new Date();

    await user.save();

    return { status: true, user };
};