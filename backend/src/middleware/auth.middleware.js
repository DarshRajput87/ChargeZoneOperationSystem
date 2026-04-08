const jwt = require("jsonwebtoken");

// auth.middleware.js  — in your protect function, change token extraction to:

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback: query param (needed for EventSource / SSE)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
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