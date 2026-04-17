// routes/users.js — backend routes for the Settings page
// Mounted at: /api/users

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("./User");

// Only ADMIN can manage users
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ message: "Admin only" });
  next();
};

// GET /api/users — list all users (omit password)
router.get("/", adminOnly, async (req, res) => {
  const users = await User.find().select("-password").lean();
  res.json(users);
});

// POST /api/users — create user
router.post("/", adminOnly, async (req, res) => {
  const { name, email, password, role, allowedModules } = req.body;
  if (await User.findOne({ email }))
    return res.status(400).json({ message: "Email already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role, allowedModules });
  res.status(201).json({ ...user.toObject(), password: undefined });
});

// PUT /api/users/:id — update user
router.put("/:id", adminOnly, async (req, res) => {
  const { name, email, password, role, allowedModules } = req.body;
  const update = { name, email, role, allowedModules };
  if (password) update.password = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// PATCH /api/users/:id/status — toggle ACTIVE/DISABLED
router.patch("/:id/status", adminOnly, async (req, res) => {
  const { status } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// DELETE /api/users/:id
router.delete("/:id", adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;
