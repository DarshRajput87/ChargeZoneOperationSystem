const repo = require("./customer.repository");
const mapper = require("./customer.mapper");

exports.searchUsers = async (query) => {
    return repo.searchUsers(query);
};

exports.getUserDetails = async (userId, query) => {
    const [user, vehicles, bookingsResult] = await Promise.all([
        repo.getUser(userId),
        repo.getVehicles(userId),
        repo.getBookings(userId, query),
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
        chargeCoinsSummary 
    });
};