// src/modules/feedback/feedback.service.js

const Model = require("./customerFeedback.model"); // adjust path if needed

exports.saveFeedback = async (mobile, type) => {
    const user = await Model.findOneAndUpdate(
        {
            $or: [
                { mobile: mobile },
                { mobile: Number(mobile) }
            ]
        },
        {
            HelpNeeded: type,
            helpResponseAt: new Date(),
        },
        { new: true, upsert: true }
    );

    return { status: true, user };
};

