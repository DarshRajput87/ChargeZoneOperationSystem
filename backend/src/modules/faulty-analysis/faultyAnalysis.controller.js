const service = require("./faultyAnalysis.service");

async function topStations(req, res) {
    const data = await service.getTopStations();
    res.json(data);
}

async function partyDistribution(req, res) {
    const data = await service.getPartyDistribution();
    res.json(data);
}

async function reasons(req, res) {
    const data = await service.getReasonDistribution();
    res.json(data);
}

async function cityHeatmap(req, res) {
    const data = await service.getCityHeatmap();
    res.json(data);
}

async function trend(req, res) {
    const data = await service.getTrend();
    res.json(data);
}

async function connectorReliability(req, res) {
    const data = await service.getConnectorReliability();
    res.json(data);
}

async function recentFaults(req, res) {
    const data = await service.getRecentFaults();
    res.json(data);
}

async function stationHealth(req, res) {
    const data = await service.getStationHealth();
    res.json(data);
}

async function frequency(req, res) {
    const data = await service.getFaultFrequency();
    res.json(data);
}
async function trend(req, res) {

    try {

        const data = await service.getTrend();
        res.json(data);

    } catch (err) {

        console.error("Trend error:", err);

        res.status(500).json({
            error: "Failed to fetch fault trend"
        });

    }
}

module.exports = {
    topStations,
    partyDistribution,
    reasons,
    cityHeatmap,
    trend,
    connectorReliability,
    recentFaults,
    stationHealth,
    frequency
};