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
// 🟢 START SERVER
// =====================================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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
            try {
                await generateMetrics();
            } catch (err) {
                console.error("Initial metrics error:", err);
            }

            cron.schedule("*/15 * * * *", async () => {
                try { await generateMetrics(); } catch (e) { console.error(e); }
            });

            // ───────────────── SLA Sync (every hour)
            try {
                await syncSlaStatuses(global.coeDb, global.cmsDb);
            } catch (err) {
                console.error("Initial SLA sync error:", err);
            }

            cron.schedule("0 * * * *", async () => {
                try { await syncSlaStatuses(global.coeDb, global.cmsDb); } catch (e) { console.error(e); }
            });

            // ───────────────── Faulty Analysis
            try {
                await generateFaultyAnalysis();
            } catch (err) {
                console.error("Initial faulty analysis error:", err);
            }

            cron.schedule("*/30 * * * *", async () => {
                try { await generateFaultyAnalysis(); } catch (e) { console.error(e); }
            });
        });

        cmsConnection.on("error", (err) => {
            console.error("CMS MongoDB connection error:", err);
        });

    })
    .catch((err) => {
        console.error("COE MongoDB connection error:", err);
    });

console.log("Deployment Done for general");
console.log("Change Reflected")