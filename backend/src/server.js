require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const app = require("./app");
const cron = require("node-cron");

const { generateMetrics } = require("./modules/dashboard/dashboard.service");
const { syncSlaStatuses } = require("./modules/sla-sync/sla-sync.service");
const { generateFaultyAnalysis } = require("./modules/faulty-analysis/faultyAnalysis.service");

const PORT = process.env.PORT || 5000;

// Suppress deprecated 'new' option warning
mongoose.set('returnDocument', 'after');


// =====================================================
// 🔵 CONNECT COE DATABASE (Local)
// =====================================================

mongoose.connect(process.env.MONGO_URI, {
  dbName: "ChargeZoneOperationEngine",
})
  .then(() => {

    console.log("COE MongoDB Connected");

    // expose COE DB globally
    global.coeDb = mongoose.connection.db;

    // =====================================================
    // 🟣 CONNECT CMS DATABASE (Atlas)
    // =====================================================

    const cmsConnection = mongoose.createConnection(
      process.env.CMS_MONGO_URI,
      { dbName: "chargezoneprod" }
    );

    cmsConnection.once("open", async () => {

      console.log("CMS MongoDB Connected");

      global.cmsConnection = cmsConnection;
      global.cmsDb = cmsConnection.db;

      // ───────────────── Dashboard Metrics (every 15 min)
      await generateMetrics();

      cron.schedule("*/15 * * * *", async () => {
        await generateMetrics();
      });

      // ───────────────── SLA Sync (every hour)
      await syncSlaStatuses(global.coeDb, global.cmsDb);

      cron.schedule("0 * * * *", async () => {
        await syncSlaStatuses(global.coeDb, global.cmsDb);
      });

      // ───────────────── Faulty Analysis
      await generateFaultyAnalysis();

      cron.schedule("*/30 * * * *", async () => {
        await generateFaultyAnalysis();
      });

      // ───────────────── Start Server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

    });

  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

console.log("Deployment Done for general");
console.log("Change Reflected")