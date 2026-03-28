exports.getReviewAnalysis = async (query) => {
    const db = global.coeDb;

    const filter = {};

    // 🔍 Filter: Help Needed only (frontend sends ?HelpNeeded=yes)
    if (query.HelpNeeded === "yes") {
        filter.HelpNeeded = "yes";
    }

    // 🔍 Filter: rating
    if (query.rating) {
        filter.rating = parseInt(query.rating);
    }

    // 🔍 Date range filter
    if (query.startDate && query.endDate) {
        filter.dateTime = {
            $gte: new Date(query.startDate),
            $lte: new Date(query.endDate),
        };
    }

    const data = await db.collection("customer_feedback_logs")
        .find(filter)
        .sort({ dateTime: -1 })
        .toArray();

    return {
        data,
        total: data.length,
    };
};