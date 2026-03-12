class FaultySessionService {

    constructor(db) {
        this.collection =
            db.collection("ocpi_emsp_faulty_session");
    }

    async getSessions({ partyId, page = 1, limit = 10 }) {

        const query = { still_exist: true };

        if (partyId) query.partyId = partyId;

        const skip = (page - 1) * limit;

        const [docs, total] = await Promise.all([

            this.collection
                .find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),

            this.collection.countDocuments(query)

        ]);

        const data = docs.map(d => {

            const notification =
                d.mail_history?.find(m => m.type === "Notification");

            return {

                bookingId: d.bookingId,
                partyId: d.partyId,

                faultyReason:
                    d.faulty_reasons?.join(", ") || "Unknown",

                mailSentTime:
                    notification?.timestamp || null,

                stationName: d.station_name,
                city: d.city,
                state: d.state,

                connectorId: d.connector_id,
                energyConsumed: d.energy_consumed

            };

        });

        return { data, total };

    }

}

module.exports = FaultySessionService;