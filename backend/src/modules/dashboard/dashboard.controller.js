const DashboardMetrics = require("./dashboard.model");

exports.getMetrics = async (req, res) => {
  try {
    const metrics = await DashboardMetrics.findOne().lean();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard metrics",
    });
  }
};