const simulator = require("./simulator.service");

/* ───────── CONNECT ───────── */
exports.connect = async (req, res) => {
    try {
        const { wsUrl } = req.body;

        const result = await simulator.connect(wsUrl);

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── STATUS ───────── */
exports.sendStatus = (req, res) => {
    try {
        const { status } = req.body;

        simulator.sendStatusNotification(status);

        res.json({
            status: "StatusNotification sent",
            chargerStatus: status
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── START ───────── */
exports.start = (req, res) => {
    try {
        simulator.startTransaction();

        res.json({ status: "StartTransaction sent" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── STOP ───────── */
exports.stop = (req, res) => {
    try {
        simulator.stopTransaction();

        res.json({ status: "StopTransaction sent" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── ✅ SINGLE METER API ───────── */
exports.sendMeterValues = async (req, res) => {
    try {

        await simulator.sendManualMeter(req.body);

        res.json({ status: "MeterValues sent" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── LOGS ───────── */
exports.getLogs = (req, res) => {
    try {
        const logs = simulator.getLogs();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.clearLogs = (req, res) => {
    try {
        simulator.clearLogs();
        res.json({ status: "Logs cleared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ───────── FAULT SCENARIOS ───────── */
exports.listFaults = async (req, res) => {
    try {

        const faults = await simulator.listFaultScenarios();

        res.json(faults);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createFault = async (req, res) => {
    try {

        const fault = await simulator.createFaultScenario(req.body);

        res.json(fault);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendFault = async (req, res) => {
    try {

        const { id } = req.body;

        await simulator.sendFaultScenario(id);

        res.json({ status: "Fault scenario sent" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};