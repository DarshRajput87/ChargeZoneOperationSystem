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

        const { payload, token } = req.body;

        const result = await service.pushSettlement(payload, token);

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};