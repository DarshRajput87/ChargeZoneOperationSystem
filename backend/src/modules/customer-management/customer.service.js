const repo = require("./customer.repository");
const mapper = require("./customer.mapper");

exports.searchUsers = async (query, filters, page, limit) => {
    return repo.searchUsers(query, filters, page, limit);
};

exports.getUserDetails = async (userId, query) => {
    const [user, vehicles, bookingsResult, segmentData, ratingStats] = await Promise.all([
        repo.getUser(userId),
        repo.getVehicles(userId),
        repo.getBookings(userId, query),
        repo.getUserSegment(userId, query.refDate || query.endDate),
        repo.getUserRatingStats(userId),
    ]);
    const chargeCoinsSummary = await repo.getChargeCoinsSummary(userId);

    if (!user) {
        throw new Error("User not found");
    }
    return mapper.formatUser({
        user,
        vehicles,
        bookingsResult,
        query,
        chargeCoinsSummary,
        segmentData,
        ratingStats
    });
};

exports.getUserSegment = async (userId) => {
    return repo.getUserSegment(userId);
};