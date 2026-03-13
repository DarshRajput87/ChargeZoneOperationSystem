const FaultyAnalysisModel = require("./faultyAnalysis.model");

const collection = () =>
    global.coeDb.collection("ocpi_emsp_faulty_session");


// ================================
// Generate Station Analysis
// ================================
async function generateFaultyAnalysis() {

    const rawCollection = collection();

    const pipeline = [
        {
            $group: {
                _id: {
                    charger_station_id: "$charger_station_id",
                    partyId: "$partyId"
                },
                station_name: { $first: "$station_name" },
                city: { $first: "$city" },
                state: { $first: "$state" },
                total_faulty_sessions: { $sum: 1 },
                first_faulty_at: { $min: "$created_at" },
                last_faulty_at: { $max: "$created_at" }
            }
        }
    ];

    const stations = await rawCollection.aggregate(pipeline).toArray();

    for (const station of stations) {

        const charger_station_id = station._id.charger_station_id;
        const partyId = station._id.partyId;

        const reasonCounts = await rawCollection.aggregate([
            {
                $match: {
                    charger_station_id,
                    partyId
                }
            },
            { $unwind: "$faulty_reasons" },
            {
                $group: {
                    _id: "$faulty_reasons",
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        const faulty_reason_ratio = reasonCounts.map(r => ({
            reason: r._id,
            percentage: Number(
                ((r.count / station.total_faulty_sessions) * 100).toFixed(2)
            )
        }));

        let main_fault_reason = null;
        let main_fault_percentage = null;

        if (faulty_reason_ratio.length > 0) {

            const sorted = [...faulty_reason_ratio].sort(
                (a, b) => b.percentage - a.percentage
            );

            main_fault_reason = sorted[0].reason;
            main_fault_percentage = sorted[0].percentage;
        }

        const doc = {
            charger_station_id,
            partyId,
            station_name: station.station_name,
            city: station.city,
            state: station.state,
            total_faulty_sessions: station.total_faulty_sessions,
            faulty_reason_ratio,
            main_fault_reason,
            main_fault_percentage,
            first_faulty_at: station.first_faulty_at,
            last_faulty_at: station.last_faulty_at,
            updated_at: new Date()
        };

        await FaultyAnalysisModel.upsert(doc);
    }

    return stations.length;
}


// ================================
// Fault Trend
// ================================
async function getTrend() {

    return collection()
        .aggregate([
            {
                $match: {
                    created_at: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$created_at"
                        }
                    },
                    faults: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])
        .toArray();
}


// ================================
// Party Distribution
// ================================
async function getPartyDistribution() {

    return collection()
        .aggregate([
            {
                $group: {
                    _id: "$partyId",
                    faults: { $sum: 1 }
                }
            },
            { $sort: { faults: -1 } }
        ])
        .toArray();
}


// ================================
// Fault Reasons
// ================================
async function getReasonDistribution() {

    return collection()
        .aggregate([
            { $unwind: "$faulty_reasons" },
            {
                $group: {
                    _id: "$faulty_reasons",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ])
        .toArray();
}


// ================================
// Top Stations
// ================================
async function getTopStations() {

    return collection()
        .aggregate([
            {
                $group: {
                    _id: "$charger_station_id",
                    station_name: { $first: "$station_name" },
                    city: { $first: "$city" },
                    faults: { $sum: 1 }
                }
            },
            { $sort: { faults: -1 } },
            { $limit: 10 }
        ])
        .toArray();
}


// ================================
// Recent Faults
// ================================
async function getRecentFaults() {

    return collection()
        .find({})
        .sort({ created_at: -1 })
        .limit(20)
        .toArray();
}


module.exports = {
    generateFaultyAnalysis,
    getTrend,
    getPartyDistribution,
    getReasonDistribution,
    getTopStations,
    getRecentFaults
};