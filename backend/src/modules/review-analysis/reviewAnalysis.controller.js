const service = require("./reviewAnalysis.service");

exports.getReviewAnalysis = async (req, res) => {
    try {
        const result = await service.getReviewAnalysis(req.query);

        res.json({
            success: true,
            ...result,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch review analysis",
        });
    }
};