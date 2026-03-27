const { ObjectId } = require("mongodb"); // ✅ already at top, good

class InProgressService {
  constructor(db) {
    this.collection = db.collection("ocpi_emsp_in_progressbooking");
  }

  async getSessions({ partyId, status, cursor, limit = 10 }) {

    const query = {};
    if (partyId) query.partyId = partyId;
    if (status) query.status = status;

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const visibilityFilter = {
      $or: [
        { status: { $ne: "completed" } },
        { status: "completed", bookingEndTime: { $gte: tenMinutesAgo } }
      ]
    };

    const finalQuery = { $and: [query, visibilityFilter] };

    // ✅ Cursor goes inside $and to avoid collision with top-level keys
    if (cursor) {
      finalQuery.$and.push({ _id: { $lt: new ObjectId(cursor) } });
    }

    const parsedLimit = parseInt(limit) || 10;

    // ✅ Fetch one extra to detect if next page exists
    const docs = await this.collection
      .find(finalQuery)
      .sort({ _id: -1 })
      .limit(parsedLimit + 1)
      .toArray();

    const hasMore = docs.length > parsedLimit;
    const pageDocs = hasMore ? docs.slice(0, parsedLimit) : docs;

    // ✅ Only set nextCursor when there are actually more results
    const nextCursor = hasMore
      ? pageDocs[pageDocs.length - 1]._id.toString()
      : null;

    // ✅ Real total — uses same visibility filter but no cursor filter
    const totalQuery = { $and: [query, visibilityFilter] };
    const total = await this.collection.countDocuments(totalQuery);

    return { data: pageDocs, total, nextCursor };
  }

  async getSummary() {
    const result = await this.collection.aggregate([
      {
        $group: {
          _id: "$partyId",
          total: { $sum: 1 },
          notified: {
            $sum: {
              $cond: [{ $ifNull: ["$lifecycle.notificationSentAt", false] }, 1, 0]
            }
          },
          reminder1: {
            $sum: {
              $cond: [{ $ifNull: ["$lifecycle.reminder1SentAt", false] }, 1, 0]
            }
          },
          finalReminder: {
            $sum: {
              $cond: [{ $ifNull: ["$lifecycle.finalReminderSentAt", false] }, 1, 0]
            }
          }
        }
      }
    ], { allowDiskUse: true }).toArray();

    return result;
  }
}

module.exports = InProgressService;