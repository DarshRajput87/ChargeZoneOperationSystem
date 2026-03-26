const { ObjectId } = require("mongodb");

class InProgressService {
  constructor(db) {
    this.collection = db.collection("ocpi_emsp_in_progressbooking");
  }

  async getSessions({ partyId, status, cursor, limit = 10 }) {

    const query = {};

    if (partyId) query.partyId = partyId;
    if (status) query.status = status;

    // Filter out 'completed' sessions older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // We want: (status != 'completed') OR (status == 'completed' AND bookingEndTime >= tenMinutesAgo)
    const visibilityFilter = {
      $or: [
        { status: { $ne: "completed" } },
        {
          status: "completed",
          bookingEndTime: { $gte: tenMinutesAgo }
        }
      ]
    };

    // Combine with existing filters
    const finalQuery = { $and: [query, visibilityFilter] };

    if (cursor) {
      finalQuery._id = { $lt: new ObjectId(cursor) };
    }

    const parsedLimit = parseInt(limit) || 10;

    const data = await this.collection
      .find(finalQuery)
      .sort({ _id: -1 })
      .limit(parsedLimit)
      .toArray();

    const nextCursor = data.length > 0 ? data[data.length - 1]._id.toString() : null;

    return { data, total: 0, nextCursor };
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