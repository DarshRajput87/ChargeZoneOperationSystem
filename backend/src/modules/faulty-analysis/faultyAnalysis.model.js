class FaultyAnalysisModel {

  static collection() {
    return global.coeDb.collection("ocpi_emsp_faulty_analysis");
  }

  static async getAll(query = {}) {
    return this.collection()
      .find(query)
      .sort({ total_faulty_sessions: -1 })
      .toArray();
  }

  static async getTop(limit = 10) {
    return this.collection()
      .find({})
      .sort({ total_faulty_sessions: -1 })
      .limit(limit)
      .toArray();
  }

  static async upsert(data) {
    return this.collection().updateOne(
      {
        charger_station_id: data.charger_station_id,
        partyId: data.partyId
      },
      { $set: data },
      { upsert: true }
    );
  }
}

module.exports = FaultyAnalysisModel;