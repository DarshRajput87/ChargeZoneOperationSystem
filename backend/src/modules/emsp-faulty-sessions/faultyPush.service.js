const axios = require("axios");

class FaultyPushService {

  constructor(db) {
    this.collection =
      db.collection("ocpi_emsp_faulty_session");
  }

  async pushFaultySessions() {

    const sessions =
      await this.collection.find({
        still_exist: true
      }).toArray();

    if (!sessions.length) {
      console.log("No faulty sessions found");
      return;
    }

    const tenantMap = {};

    for (const s of sessions) {

      const tenantId = s.tenant;

      if (!tenantId) continue;

      if (!tenantMap[tenantId]) {
        tenantMap[tenantId] = [];
      }

      tenantMap[tenantId].push({
        booking_id: String(s.bookingId)
      });

    }

    for (const [tenantId, bookings] of Object.entries(tenantMap)) {

      try {

        const url =
          `https://api.chargecloud.net/ocpi/emsp/2.2/ocpifaultysession/${tenantId}`;

        const response =
          await axios.post(url, bookings, {
            headers: {
              Authorization: `Bearer ${process.env.OCPI_TOKEN}`,
              "Content-Type": "application/json"
            }
          });

        console.log(
          `Faulty sessions pushed for ${tenantId}`,
          response.data
        );

      } catch (err) {

        console.error(
          `Faulty push failed for ${tenantId}`,
          err.response?.data || err.message
        );

      }

    }

  }

}

module.exports = FaultyPushService;