const DashboardMetrics = require("./dashboard.model");

exports.generateMetrics = async () => {
  try {
    if (!global.cmsConnection) {
      console.log("CMS DB not ready...");
      return;
    }

    const cmsDB = global.cmsConnection.db;

    console.log("Generating dashboard metrics (Production Accurate Mode)...");

    // ===============================
    // 1️⃣ EV SERVED
    // ===============================
    const evServed = await cmsDB
      .collection("chargerbookings")
      .countDocuments({ status: "completed" });

    // ===============================
    // 2️⃣ TOTAL TENANTS
    // ===============================
    const totalTenants = await cmsDB
      .collection("companies")
      .estimatedDocumentCount();

    // ===============================
    // 3️⃣ TOTAL ENERGY
    // ===============================
    const energyAgg = await cmsDB.collection("chargerbookings").aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalEnergy: {
            $sum: { $ifNull: ["$estimated_units", 0] }
          }
        }
      }
    ]).toArray();

    const totalEnergy = energyAgg[0]?.totalEnergy || 0;

    // ===============================
    // 4️⃣ CHARGER STATUS BREAKDOWN
    // Fully normalized inside Mongo
    // ===============================
    const chargerAgg = await cmsDB.collection("chargers").aggregate([
      {
        $match: {
          is_deleted: { $ne: true }
        }
      },
      {
        $project: {
          normalizedStatus: {
            $cond: [
              { $eq: ["$operational_status", "ComingSoon"] },
              "comingsoon",
              {
                $replaceAll: {
                  input: {
                    $toLower: {
                      $trim: { input: { $ifNull: ["$charger_status", ""] } }
                    }
                  },
                  find: " ",
                  replacement: ""
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$normalizedStatus",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    let chargerStats = {
      total: 0,
      available: 0,
      unavailable: 0,
      inUse: 0,
      powerLoss: 0,
      faulted: 0,
      comingSoon: 0
    };

    chargerAgg.forEach(item => {
      const status = item._id;
      const count = item.count;

      chargerStats.total += count;

      if (status === "available") chargerStats.available += count;
      else if (status === "unavailable") chargerStats.unavailable += count;
      else if (status === "inuse") chargerStats.inUse += count;
      else if (status === "powerloss") chargerStats.powerLoss += count;
      else if (status === "faulted") chargerStats.faulted += count;
      else if (status === "comingsoon") chargerStats.comingSoon += count;
      else chargerStats.unavailable += count; // fallback safety
    });

    await DashboardMetrics.findOneAndUpdate(
      {},
      {
        evServed,
        totalTenants,
        totalEnergy,
        chargerStats,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    console.log("Dashboard metrics updated successfully.");
  } catch (error) {
    console.error("Dashboard metrics error:", error.message);
  }
};