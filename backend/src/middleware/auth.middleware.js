const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const blockViewerChanges = (req, res, next) => {
  if (req.user && req.user.role === "VIEWER") {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return res.status(403).json({ message: "Forbidden: Viewer accounts cannot modify data" });
    }
  }
  next();
};

module.exports = { protect, blockViewerChanges };