require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const app = require("./app");
const cron = require("node-cron");
const { generateMetrics } = require("./modules/dashboard/dashboard.service");

const PORT = process.env.PORT || 5000;


// =====================================================
// 🔵 CONNECT COE DATABASE (Local)
// =====================================================
mongoose.connect(process.env.MONGO_URI, {
  dbName: "ChargeZoneOperationEngine"
})
  .then(() => {

    console.log("COE MongoDB Connected");

    // 🔥 expose COE DB
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

      global.cmsConnection = cmsConnection;   // keep this
      global.cmsDb = cmsConnection.db;        // add this

      await generateMetrics();

      cron.schedule("*/15 * * * *", async () => {
        await generateMetrics();
      });

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    });

  })
  .catch(console.error);