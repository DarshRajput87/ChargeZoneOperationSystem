// models/User.js — updated with allowedModules field

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["ADMIN", "OPS", "SUPPORT", "VIEWER"],
            default: "VIEWER",
        },
        status: {
            type: String,
            enum: ["ACTIVE", "DISABLED"],
            default: "ACTIVE",
        },
        // Array of module keys the user is allowed to access.
        // Null / missing = all modules (backwards compatible).
        allowedModules: {
            type: [String],
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);