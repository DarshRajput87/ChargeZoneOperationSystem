exports.getAnalysis = async (coeDb, cmsDb) => {

    // 1️⃣ Get active sessions
    const sessions = await coeDb
        .collection("ocpiemsp_in_progressbooking")
        .find({ status: "in_progress" })
        .toArray();

    if (!sessions.length) {
        return {
            totals: { totalActive: 0, totalBreached: 0, totalWarning: 0 },
            stationAnalysis: [],
            partyAnalysis: []
        };
    }

    const chargerObjectIds = sessions.map(s => s.charger);

    // 2️⃣ Get existing station mappings
    const stationMappings = await coeDb
        .collection("station_session_analysis")
        .find({
            charger: { $in: chargerObjectIds }
        })
        .toArray();

    const stationMap = {};

    stationMappings.forEach(m => {
        stationMap[m.charger.toString()] = m;
    });

    // 3️⃣ Find missing chargers (not yet mapped)
    const missingChargers = chargerObjectIds.filter(
        id => !stationMap[id.toString()]
    );

    if (missingChargers.length) {

        const chargers = await cmsDb.collection("chargers")
            .find({ _id: { $in: missingChargers } })
            .toArray();

        for (const charger of chargers) {

            const station = await cmsDb.collection("chargingstations")
                .findOne({ _id: charger.charging_station });

            if (!station) continue;

            const doc = {
                charger: charger._id,
                chargerId: charger.charger_id,

                station: station._id,
                stationId: station.station_id,

                stationName: station.name,
                city: station.city,
                state: station.state,

                createdAt: new Date(),
                updatedAt: new Date()
            };

            await coeDb
                .collection("station_session_analysis")
                .insertOne(doc);

            stationMap[charger._id.toString()] = doc;
        }
    }

    // 4️⃣ Analysis
    const now = new Date();

    const stationStats = {};
    const partyStats = {};

    let totalBreached = 0;
    let totalWarning = 0;

    sessions.forEach(session => {

        const durationHours =
            (now - new Date(session.bookingStartTime)) /
            (1000 * 60 * 60);

        const station = stationMap[session.charger.toString()];
        if (!station) return;

        const stationKey = station.station.toString();

        if (!stationStats[stationKey]) {
            stationStats[stationKey] = {
                stationName: station.stationName,
                stationId: station.stationId,
                city: station.city,
                activeSessions: 0,
                slaBreached: 0,
                slaWarning: 0,
                longestSession: 0
            };
        }

        stationStats[stationKey].activeSessions++;

        if (durationHours >= 48) {
            stationStats[stationKey].slaBreached++;
            totalBreached++;
        }

        else if (durationHours >= 24) {
            stationStats[stationKey].slaWarning++;
            totalWarning++;
        }

        stationStats[stationKey].longestSession = Math.max(
            stationStats[stationKey].longestSession,
            durationHours
        );

        // Party stats
        const party = session.partyId;

        if (!partyStats[party]) {
            partyStats[party] = {
                partyId: party,
                activeSessions: 0,
                slaBreached: 0,
                slaWarning: 0
            };
        }

        partyStats[party].activeSessions++;

        if (durationHours >= 48)
            partyStats[party].slaBreached++;

        else if (durationHours >= 24)
            partyStats[party].slaWarning++;
    });

    return {
        totals: {
            totalActive: sessions.length,
            totalBreached,
            totalWarning
        },
        stationAnalysis: Object.values(stationStats),
        partyAnalysis: Object.values(partyStats)
    };
};