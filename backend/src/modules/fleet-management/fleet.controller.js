const fleetService = require("./fleet.service");

exports.getTenants = async (req, res) => {
    try {
        const data = await fleetService.getTenants();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOcpiClients = async (req, res) => {
    try {
        const data = await fleetService.getOcpiClients();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createFleet = async (req, res) => {
    try {
        const result = await fleetService.createFleet(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};