exports.validateTags = (req, res, next) => {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ error: "Tags must be array" });
    }

    next();
};