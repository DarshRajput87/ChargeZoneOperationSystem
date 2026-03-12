const { ObjectId } = require("mongodb");

class InProgressService {
  constructor(db) {
    this.collection = db.collection("ocpi_emsp_in_progressbooking");
  }

  async getSessions({ partyId, status, page = 1, limit = 10 }) {

    const query = {};

    if (partyId) query.partyId = partyId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { data, total };
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
    ]).toArray();

    return result;
  }
}

module.exports = InProgressService;