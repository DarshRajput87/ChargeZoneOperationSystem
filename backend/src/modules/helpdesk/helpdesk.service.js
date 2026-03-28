const { ObjectId } = require("mongodb");

const getCollection = () =>
    global.coeDb.collection("customer_feedback_logs");

// 🔹 Fetch HelpNeeded users
exports.getHelpNeededUsers = async (query) => {
    const filter = {
        HelpNeeded: "yes",
        userAttended: { $ne: true }
    };

    return await getCollection()
        .find(filter)
        .sort({ dateTime: -1 })
        .toArray();
};

// 🔹 Fetch Closed users
exports.getClosedUsers = async (query) => {
    const rawUsers = await getCollection().find({
        $or: [
            { userAttended: true, HelpNeeded: "yes" },
            { history: { $elemMatch: { userAttended: true, HelpNeeded: "yes" } } }
        ]
    }).toArray();

    const result = [];

    rawUsers.forEach(user => {
        const allClosedForUser = [];

        if (user.HelpNeeded === "yes" && user.userAttended === true) {
            allClosedForUser.push({
                sessionDate: user.dateTime,
                HelpNeeded: user.HelpNeeded,
                helpResponseAt: user.helpResponseAt,
                userAttended: user.userAttended,
                attendedBy: user.attendedBy,
                attendedAt: user.attendedAt,
                feedback: user.feedback,
                rating: user.rating,
                tags: user.tags,
                comment: user.comment
            });
        }

        if (user.history && user.history.length > 0) {
            user.history.forEach(hist => {
                if (hist.HelpNeeded === "yes" && hist.userAttended === true) {
                    allClosedForUser.push(hist);
                }
            });
        }

        if (allClosedForUser.length > 0) {
            allClosedForUser.sort((a, b) => new Date(b.attendedAt || 0) - new Date(a.attendedAt || 0));

            const latestClosedTicket = allClosedForUser[0];
            const otherClosedTickets = allClosedForUser.slice(1);

            result.push({
                _id: user._id,
                mobile: user.mobile,
                userName: user.userName,
                attendedBy: latestClosedTicket.attendedBy,
                tags: latestClosedTicket.tags,
                comment: latestClosedTicket.comment,
                attendedAt: latestClosedTicket.attendedAt,
                dateTime: latestClosedTicket.sessionDate || latestClosedTicket.dateTime,
                history: otherClosedTickets
            });
        }
    });

    result.sort((a, b) => new Date(b.attendedAt || 0) - new Date(a.attendedAt || 0));
    return result;
};

// 🔹 Update attended person
exports.updateAttendedBy = async (id, attendedBy) => {
    return await getCollection().updateOne(
        { _id: new ObjectId(id) },
        { $set: { attendedBy } }
    );
};

// 🔹 Update tags
exports.updateTags = async (id, tags) => {
    return await getCollection().updateOne(
        { _id: new ObjectId(id) },
        { $set: { tags } }
    );
};

// 🔹 Update comment
exports.updateComment = async (id, comment) => {
    return await getCollection().updateOne(
        { _id: new ObjectId(id) },
        { $set: { comment } }
    );
};

// 🔹 Close ticket
exports.closeTicket = async (id) => {
    return await getCollection().updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                userAttended: true,
                attendedAt: new Date()
            }
        }
    );
};