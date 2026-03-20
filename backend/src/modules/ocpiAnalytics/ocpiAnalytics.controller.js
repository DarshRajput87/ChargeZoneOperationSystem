const service = require("./ocpiAnalytics.service");

exports.summary = async (req, res) => {
    try {
        const data = await service.getSummary(global.cmsDb, req.query);
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.modules = async (req, res) => {
    try {
        const data = await service.getModuleStats(global.cmsDb, req.query);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.partners = async (req, res) => {
    try {
        const data = await service.getPartnerStats(global.cmsDb, req.query);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.failures = async (req, res) => {
    try {
        const data = await service.getFailureStats(global.cmsDb, req.query);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.logs = async (req, res) => {
    try {
        const data = await service.getLogs(
            global.cmsDb,
            req.query,
            req.query
        );
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

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