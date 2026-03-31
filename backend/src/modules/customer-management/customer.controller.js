const service = require("./customer.service");

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Query is required" });
        }

        const data = await service.searchUsers(query);

        res.json(data);
    } catch (err) {
        console.error("searchUsers error:", err);
        res.status(500).json({ error: "Failed to search users" });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        const data = await service.getUserDetails(userId, req.query);

        res.json(data);
    } catch (err) {
        console.error("🔥 FULL ERROR:", err); // VERY IMPORTANT
        res.status(500).json({ error: err.message || "Failed to fetch user details" });
    }
};

exports.getChargeCoinsHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const data = await service.getChargeCoinsHistory(userId, { page, limit });

        res.json(data);
    } catch (err) {
        console.error("getChargeCoinsHistory error:", err);
        res.status(500).json({ error: "Failed to fetch charge coins history" });
    }
};

exports.getUserSegment = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await service.getUserSegment(userId);
        res.json({ segmentData: data });
    } catch (err) {
        console.error("getUserSegment error:", err);
        res.status(500).json({ error: "Failed to get user segment" });
    }
};
