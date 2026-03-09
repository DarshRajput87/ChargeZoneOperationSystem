const service = require("./analysis.service");

exports.getAnalysis = async (req, res) => {

    try {

        const data = await service.getAnalysis(
            global.coeDb,
            global.cmsDb
        );

        res.json({
            success: true,
            data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};