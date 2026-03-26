const FaultySessionService = require("./faultySession.service");
const FaultyPushService = require("./faultyPush.service");

/* ─────────────────────────────────────────────
   GET FAULTY SESSIONS
───────────────────────────────────────────── */

exports.getFaultySessions = async (req, res) => {
    try {
        if (!global.coeDb) {
            return res.status(500).json({ success: false, error: "COE DB not ready" });
        }
        const service = new FaultySessionService(global.coeDb);
        const result = await service.getSessions(req.query);
        res.json({
            success: true,
            data: result.data,
            total: result.total,
            nextCursor: result.nextCursor
        });
    } catch (err) {
        console.error("FAULTY_SESSION_ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/* ─────────────────────────────────────────────
   SUMMARY
───────────────────────────────────────────── */

exports.getSummary = async (req, res) => {
    try {
        if (!global.coeDb) {
            return res.status(500).json({ success: false, error: "COE DB not ready" });
        }
        const service = new FaultySessionService(global.coeDb);
        const result = await service.getSummary();
        res.json({ success: true, data: result });
    } catch (err) {
        console.error("FAULTY_SUMMARY_ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/* ─────────────────────────────────────────────
   PREVIEW PUSH
───────────────────────────────────────────── */

exports.previewFaultyPush = async (req, res) => {
    try {
        if (!global.coeDb) {
            return res.status(500).json({ success: false, error: "COE DB not ready" });
        }
        const { bookingIds } = req.body;
        const service = new FaultyPushService(global.coeDb);
        const previews = await service.buildPreview(bookingIds);
        res.json({ success: true, previews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* ─────────────────────────────────────────────
   PUSH FAULTY SESSION
───────────────────────────────────────────── */

exports.pushFaultySession = async (req, res) => {
    try {
        if (!global.coeDb) {
            return res.status(500).json({ success: false, error: "COE DB not ready" });
        }

        // Support both single param and multi body
        const bookingIds = req.body.bookingIds || (req.params.bookingId ? [req.params.bookingId] : null);

        if (!bookingIds) {
            return res.status(400).json({ success: false, error: "No booking IDs provided" });
        }

        const service = new FaultyPushService(global.coeDb);
        const results = await service.executePush(bookingIds);

        res.json({
            success: true,
            message: "Processing completed",
            results
        });
    } catch (err) {
        console.error("FAULTY_PUSH_ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
