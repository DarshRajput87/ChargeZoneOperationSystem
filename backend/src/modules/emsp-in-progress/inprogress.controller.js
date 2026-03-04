const InProgressService = require("./inprogress.service");

exports.getSessions = async (req, res) => {

  try {

    if (!global.coeDb) {
      return res.status(500).json({
        success: false,
        error: "COE DB not ready"
      });
    }

    const service = new InProgressService(global.coeDb);

    const result = await service.getSessions(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total
    });

  } catch (err) {

    console.error("IN_PROGRESS_ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


exports.getSummary = async (req, res) => {

  try {

    if (!global.coeDb) {
      return res.status(500).json({
        success: false,
        error: "COE DB not ready"
      });
    }

    const service = new InProgressService(global.coeDb);

    const result = await service.getSummary();

    res.json({
      success: true,
      data: result
    });

  } catch (err) {

    console.error("SUMMARY_ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};