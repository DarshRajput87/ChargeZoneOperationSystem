const { ObjectId } = require("mongodb"); // ✅ moved to top

class FaultySessionService {

    constructor(db) {
        this.collection = db.collection("ocpi_emsp_faulty_session");
    }

    async getSessions({ partyId, cursor, limit = 10 }) {

        const query = { still_exist: true };

        if (partyId) query.partyId = partyId;

        if (cursor) {
            query._id = { $lt: new ObjectId(cursor) }; // ✅ uses top-level import
        }

        const parsedLimit = parseInt(limit) || 10;

        // ✅ Fetch one extra doc to detect if a next page exists
        const docs = await this.collection
            .find(query)
            .sort({ _id: -1 })
            .limit(parsedLimit + 1)
            .toArray();

        const hasMore = docs.length > parsedLimit;
        const pageDocs = hasMore ? docs.slice(0, parsedLimit) : docs;

        // ✅ Only set nextCursor if there are actually more results
        const nextCursor = hasMore
            ? pageDocs[pageDocs.length - 1]._id.toString()
            : null;

        // ✅ Real total count — uses countDocuments with a lean filter-only query
        // Excludes _id cursor filter so total always reflects the full dataset
        const totalQuery = { still_exist: true };
        if (partyId) totalQuery.partyId = partyId;
        const total = await this.collection.countDocuments(totalQuery);

        const data = pageDocs.map(d => {
            const notification = d.mail_history?.find(m => m.type === "Notification");
            return {
                bookingId: d.bookingId,
                partyId: d.partyId,
                tenantId: d.tenant_id,
                faultyReason: d.faulty_reasons?.join(", ") || "Unknown",
                mailSentTime: notification?.timestamp || null,
                stationName: d.station_name,
                city: d.city,
                state: d.state,
                connectorId: d.connector_id,
                energyConsumed: d.energy_consumed
            };
        });

        return { data, total, nextCursor }; // ✅ real total
    }

}

module.exports = FaultySessionService;