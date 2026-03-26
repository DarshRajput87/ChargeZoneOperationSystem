const axios = require("axios");
const { ObjectId } = require("mongodb");

class InProgressPushService {

  constructor(db) {
    this.collection = db.collection("ocpi_emsp_in_progressbooking");
  }

  /**
   * Build preview for a set of in-progress sessions
   */
  async buildPreview(bookingIds) {
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      throw new Error("No booking IDs provided for preview");
    }

    const queryIds = bookingIds.map(id => {
      try {
        return id.length === 24 ? new ObjectId(id) : id;
      } catch {
        return id;
      }
    });

    const sessions = await this.collection.find({
      bookingId: { $in: queryIds }
    }).toArray();

    if (!sessions.length) {
      throw new Error("No matching in-progress sessions found for the provided IDs");
    }

    const tenantMap = {};
    for (const s of sessions) {
      const tenantId = s.tenant || s.tenant_id;
      if (!tenantId) continue;
      if (!tenantMap[tenantId]) tenantMap[tenantId] = { bookings: [], docs: [] };
      tenantMap[tenantId].bookings.push({ booking_id: String(s.bookingId) });
      tenantMap[tenantId].docs.push(s);
    }

    const previews = Object.entries(tenantMap).map(([tenantId, data]) => ({
      tenantId,
      url: `https://api.chargecloud.net/ocpi/emsp/2.2/ocpifaultysession/${tenantId}`,
      payload: data.bookings,
      sessionCount: data.bookings.length,
      originalIds: data.docs.map(d => d.bookingId)
    }));

    return previews;
  }

  /**
   * Execute push for specific in-progress sessions
   */
  async executePush(bookingIds) {
    const previews = await this.buildPreview(bookingIds);
    const results = [];

    for (const preview of previews) {
      try {
        const response = await axios.post(preview.url, preview.payload, {
          headers: {
            Authorization: `Bearer ${process.env.OCPI_TOKEN}`,
            "Content-Type": "application/json"
          }
        });

        await this.collection.updateMany(
          { bookingId: { $in: preview.originalIds } },
          {
            $set: {
              status: "completed",
              ScriptClosed: "yes",
              ui_updated: true,
              settledAt: new Date()
            }
          }
        );

        results.push({
          tenantId: preview.tenantId,
          success: true,
          data: response.data
        });

      } catch (err) {
        console.error(`In-progress push failed for ${preview.tenantId}:`, err.response?.data || err.message);

        await this.collection.updateMany(
          { bookingId: { $in: preview.originalIds } },
          {
            $set: {
              ScriptClosed: "no",
              lastError: err.response?.data || err.message
            }
          }
        );

        results.push({
          tenantId: preview.tenantId,
          success: false,
          error: err.response?.data || err.message
        });
      }
    }

    return results;
  }
}

module.exports = InProgressPushService;