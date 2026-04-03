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
const simulatorRoutes = require("./modules/Charger Simulator/simulator.routes");
const ocpiAnalyticsRoutes = require("./modules/ocpiAnalytics/ocpiAnalytics.routes");
const helpdeskRoutes = require("./modules/helpdesk/helpdesk.routes");
const customerRoutes = require("./modules/customer-management/customer.routes");
const reviewAnalysisRoutes = require("./modules/review-analysis/reviewAnalysis.routes");
const feedbackRoutes = require("./modules/feedback/feedback.routes");

const { protect, blockViewerChanges } = require("./middleware/auth.middleware");

const app = express();

app.use(cors({
    origin: [
        "https://chargezoneops.online",
        "https://www.chargezoneops.online",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));


app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);
app.use("/feedback", feedbackRoutes);

// Protected middleware
app.use(protect);
app.use(blockViewerChanges);

// Protected routes
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
app.use("/api/simulator", simulatorRoutes);
app.use("/api/ocpi-analytics", ocpiAnalyticsRoutes);
app.use("/api/helpdesk", helpdeskRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/review-analysis", reviewAnalysisRoutes);

module.exports = app;
