const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const stationExplorerRoutes = require("./modules/station-explorer/station.routes");
const chargerRoutes = require("./modules/station-explorer/charger.routes");
const cdrRecoveryRoutes = require("./modules/cdr-recovery/cdr.routes");
const inProgressRoutes = require("./modules/emsp-in-progress/inprogress.routes");



const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/station-explorer", stationExplorerRoutes);
app.use("/api/station-explorer/chargers", chargerRoutes);
app.use("/api/cdr-recovery", cdrRecoveryRoutes);
app.use("/api/emsp-in-progress", inProgressRoutes);

module.exports = app;