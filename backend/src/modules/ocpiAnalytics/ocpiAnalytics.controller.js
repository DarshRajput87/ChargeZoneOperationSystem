const service = require("./ocpiAnalytics.service");

// Utility to handle straight-to-DB queries without caching temporal mismatches
const withLiveQuery = async (req, res, endpoint, serviceMethod) => {
    try {
        const data = await serviceMethod(global.cmsDb, req.query);
        res.json({ success: true, data });
    } catch (err) {
        console.error(`[Analytics Error] ${endpoint}:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.dashboardStats = (req, res) => withLiveQuery(req, res, "dashboard-stats", service.getDashboardStats);
exports.timeSeriesStats = (req, res) => withLiveQuery(req, res, "time-series-stats", service.getTimeSeriesStats);
exports.logs = (req, res) => withLiveQuery(req, res, "logs", service.getLogs);
exports.partyTimeSeriesStats = (req, res) => withLiveQuery(req, res, "party-time-series", service.getPartyTimeSeriesStats);

exports.allParties = async (req, res) => {
    try {
        const data = await service.getAllParties(global.cmsDb);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.tenants = async (req, res) => {
    try {
        const data = await service.getTenants(global.cmsDb);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};