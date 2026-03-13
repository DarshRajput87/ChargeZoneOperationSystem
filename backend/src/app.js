const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const stationExplorerRoutes = require("./modules/station-explorer/station.routes");
const chargerRoutes = require("./modules/station-explorer/charger.routes");
const cdrRecoveryRoutes = require("./modules/cdr-recovery/cdr.routes");
const inProgressRoutes = require("./modules/emsp-in-progress/inprogress.routes");
const settlementRoutes = require("./modules/settlement/settlement.routes");
const inprogressAnalysisRoutes = require("./modules/inprogress-analysis/analysis.routes");
const faultySessionRoutes = require("./modules/emsp-faulty-sessions/faultySession.routes");
const fleetRoutes = require("./modules/fleet-management/fleet.routes");
const faultyAnalysisRoutes = require("./modules/faulty-analysis/faultyAnalysis.routes");

const app = express();

const allowedOrigins = [
    "https://www.chargezoneops.online",
    "https://chargezoneops.online",
    "http://localhost:5173",
    "http://localhost:3000",
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS: " + origin));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

// Handle preflight OPTIONS requests for all routes
app.options("*", cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/station-explorer", stationExplorerRoutes);
app.use("/api/station-explorer/chargers", chargerRoutes);
app.use("/api/cdr-recovery", cdrRecoveryRoutes);
app.use("/api/emsp-in-progress", inProgressRoutes);
app.use("/api/settlement", settlementRoutes);
app.use("/api/emsp-in-progress-analysis", inprogressAnalysisRoutes);
app.use("/api/emsp-faulty-sessions", faultySessionRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/faulty-analysis", faultyAnalysisRoutes);


module.exports = app;