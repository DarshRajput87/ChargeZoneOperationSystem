const InProgressService = require("./inprogress.service");
const InProgressPushService = require("./inprogress-push.service");

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
      total: result.total,
      nextCursor: result.nextCursor
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


exports.scriptPush = async (req, res) => {

  try {

    if (!global.coeDb) {
      return res.status(500).json({
        success: false,
        error: "COE DB not ready"
      });
    }

    const { bookingIds } = req.body;

    if (!bookingIds || !bookingIds.length) {
      return res.status(400).json({
        success: false,
        error: "No booking IDs provided"
      });
    }

    const svc = new InProgressPushService(global.coeDb);

    const results = await svc.executePush(bookingIds);

    const allOk = results.every(r => r.success);

    res.json({
      success: allOk,
      results
    });

  } catch (err) {

    console.error("SCRIPT_PUSH_ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }

};