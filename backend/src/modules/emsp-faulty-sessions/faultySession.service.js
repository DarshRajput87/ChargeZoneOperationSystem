class FaultySessionService {

    constructor(db) {
        this.collection =
            db.collection("ocpi_emsp_faulty_session");
    }

    async getSessions({ partyId, cursor, limit = 10 }) {

        const query = { still_exist: true };

        if (partyId) query.partyId = partyId;

        // Implement Cursor-Based Pagination
        if (cursor) {
            query._id = { $lt: new require("mongodb").ObjectId(cursor) };
        }

        const parsedLimit = parseInt(limit) || 10;

        const docs = await this.collection
            .find(query)
            .sort({ _id: -1 }) // Sort by _id to match the cursor behavior
            .limit(parsedLimit)
            .toArray();

        // Calculate the next cursor for the frontend
        const nextCursor = docs.length > 0 ? docs[docs.length - 1]._id.toString() : null;

        const data = docs.map(d => {

            const notification =
                d.mail_history?.find(m => m.type === "Notification");

            return {

                bookingId: d.bookingId,
                partyId: d.partyId,
                tenantId: d.tenant_id,

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

        // We return an empty total to avoid countDocuments at 1M rows
        return { data, total: 0, nextCursor };

    }

}

module.exports = FaultySessionService;