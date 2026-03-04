const mongoose = require("mongoose");

const dashboardMetricsSchema = new mongoose.Schema({
  evServed: { type: Number, default: 0 },
  totalTenants: { type: Number, default: 0 },
  totalEnergy: { type: Number, default: 0 },

  chargerStats: {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    unavailable: { type: Number, default: 0 },
    inUse: { type: Number, default: 0 },        // ✅ Added
    powerLoss: { type: Number, default: 0 },    // ✅ Added
    faulted: { type: Number, default: 0 },      // ✅ Added
    comingSoon: { type: Number, default: 0 },
  },

  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DashboardMetrics", dashboardMetricsSchema);