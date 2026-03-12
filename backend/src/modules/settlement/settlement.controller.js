const service = require("./settlement.service");

exports.previewSettlement = async (req, res) => {

    try {

        const result = await service.previewSettlement(
            global.cmsConnection.db,
            req.params.bookingId
        );

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};


exports.pushSettlement = async (req, res) => {

    try {

        const { payload, token, bookingId } = req.body;

        // ── 1. Push CDR to ChargeCloud ──────────────────────────────────
        const pushResult = await service.pushSettlement(payload, token);

        // ── 2. Stamp COE record with ui_updated + prodCompleted ─────────
        const settleUpdate = await service.postSettleUpdate(
            global.coeDb,
            global.cmsDb,
            bookingId,
            pushResult.success
        );

        // ── 3. Return combined result ───────────────────────────────────
        res.json({
            ...pushResult,
            ui_updated: settleUpdate.ui_updated,
            prodCompleted: settleUpdate.prodCompleted
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};
