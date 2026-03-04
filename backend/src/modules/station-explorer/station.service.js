  const { ObjectId } = require("mongodb");

  class StationService {
    constructor(db) {
      this.stationCollection = db.collection("chargingstations");
      this.chargerCollection = db.collection("chargers");
      this.tariffCollection  = db.collection("tarrifs");
    }

    /* =========================================================
      🔥 ADVANCED SEARCH + FILTER
    ========================================================== */

    async searchStations({
      search     = "",
      status     = "",
      state      = "",
      isExternal,
      page       = 1,
      limit      = 10,
    }) {
      const query = {
        is_deleted: false,
        is_enabled: true,
      };

      const andConditions = [];

      /* ── GLOBAL SEARCH ── */
      if (search && search.trim() !== "") {
        const trimmed = search.trim();
        const searchConditions = [
          { name:       { $regex: trimmed, $options: "i" } },
          { station_id: { $regex: trimmed, $options: "i" } },
          { state:      { $regex: trimmed, $options: "i" } },
          { city:       { $regex: trimmed, $options: "i" } },
        ];
        if (ObjectId.isValid(trimmed)) {
          searchConditions.push({ _id: new ObjectId(trimmed) });
        }
        andConditions.push({ $or: searchConditions });
      }

      /* ── STATUS FILTER ── */
      if (status && status.trim() !== "") {
        andConditions.push({ status: status.trim() });
      }

      /* ── STATE FILTER ── */
      if (state && state.trim() !== "") {
        andConditions.push({ state: state.trim() });
      }

      /* ── EXTERNAL FILTER ──
        MongoDB docs may store is_external_station as:
          - boolean true / false
          - string  "true" / "false"   ← common when data came from OCPI/external APIs
          - missing / null             ← treat as internal (false)

        Use $in to match both boolean and string variants safely.
      ── */
    /* ── EXTERNAL FILTER (Robust + Clean) ── */
  if (isExternal === "true") {
  andConditions.push({
    is_external_station: { $in: [true, "true"] }
  });
}

if (isExternal === "false") {
  andConditions.push({
    $or: [
      { is_external_station: { $in: [false, "false"] } },
      { is_external_station: { $exists: false } },
      { is_external_station: null }
    ]
  });
}

      if (andConditions.length > 0) {
        query.$and = andConditions;
      }

      const pageNumber  = Math.max(Number(page)  || 1,  1);
      const limitNumber = Math.max(Number(limit) || 10, 1);
      const skip        = (pageNumber - 1) * limitNumber;

      const [data, total] = await Promise.all([
        this.stationCollection
          .find(query)
          .project({
            _id:                 1,
            name:                1,
            status:              1,
            station_id:          1,
            state:               1,
            city:                1,
            is_external_station: 1,
          })
          .skip(skip)
          .limit(limitNumber)
          .toArray(),

        this.stationCollection.countDocuments(query),
      ]);

      // Normalize is_external_station to boolean on the way out
      const normalized = data.map(s => ({
        ...s,
        is_external_station: s.is_external_station === true || s.is_external_station === "true",
      }));

      return { data: normalized, total };
    }

    /* =========================================================
      🔌 LAZY LOAD CHARGERS
    ========================================================== */

    async getChargersByStation(stationId) {
      if (!ObjectId.isValid(stationId)) return [];

     const chargers = await this.chargerCollection.aggregate([
  {
    $match: {
      charging_station: new ObjectId(stationId),
      is_deleted: false,
      operational_status: "Active",
    }
  },
  {
    $group: {
      _id: "$charger_id",
      charger_id: { $first: "$charger_id" },
      charger_status: { $first: "$charger_status" },
      tarrif: { $first: "$tarrif" }
    }
  }
]).toArray();

      if (!chargers.length) return [];

      const tariffIds = [
        ...new Set(
          chargers
            .filter(c => c.tarrif && ObjectId.isValid(c.tarrif))
            .map(c => new ObjectId(c.tarrif))
        ),
      ];

      const tariffs = await this.tariffCollection
        .find({ _id: { $in: tariffIds } })
        .project({ _id: 1, default_price_per_unit: 1 })
        .toArray();

      const tariffMap = {};
      tariffs.forEach(t => {
        tariffMap[t._id.toString()] = t.default_price_per_unit;
      });

      return chargers.map(charger => ({
        _id:            charger._id,
        charger_id:     charger.charger_id,
        charger_status: charger.charger_status,
        tariff: charger.tarrif
          ? tariffMap[charger.tarrif.toString()] ?? null
          : null,
      }));
    }
  }

  module.exports = StationService;