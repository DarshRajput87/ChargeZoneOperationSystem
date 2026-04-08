const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

function getDates() {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const now_ist = new Date(now.getTime() + IST_OFFSET);
    // Start of TODAY in IST converted back to UTC
    const d0_utc = new Date(new Date(now_ist.setUTCHours(0, 0, 0, 0)).getTime() - IST_OFFSET);

    const date_30d = new Date(d0_utc.getTime() - 29 * 24 * 60 * 60 * 1000); 
    const date_90d = new Date(d0_utc.getTime() - 89 * 24 * 60 * 60 * 1000);
    return { date_30d, date_90d };
}

// ─── GET /api/segments (standard JSON) ──────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const db = global.cmsDb;
        const users = db.collection("users");
        const bookings = db.collection("chargerbookings");
        const { date_30d, date_90d } = getDates();
        
        const roleParam = req.query.role;
        let allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        if (roleParam) {
            const roles = roleParam.split(",");
            allowedRoles = [];
            if (roles.includes("customer")) allowedRoles.push("customer");
            if (roles.includes("fleet")) allowedRoles.push("fleet_owner", "fleet_member");
            if (allowedRoles.length === 0) allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        }

        // 1. Get exact sliding window successful IDs (Match Metrics Logic)
        const [activeIds, dormantCandidateIds] = await Promise.all([
            bookings.distinct("customer_user_booked", {
                status: "completed",
                payment_status: "done",
                $expr: { $gt: ["$meterstop", "$meterstart"] },
                updatedAt: { $gte: date_30d },
            }),
            bookings.distinct("customer_user_booked", {
                status: "completed",
                payment_status: "done",
                $expr: { $gt: ["$meterstop", "$meterstart"] },
                updatedAt: { $gte: date_90d, $lt: date_30d },
            }),
        ]);

        // Format IDs to ensure ObjectIds for the $in queries
        const activeObjIds = activeIds.map(
            (id) => new mongoose.Types.ObjectId(id),
        );
        const dormantCandidateObjIds = dormantCandidateIds.map(
            (id) => new mongoose.Types.ObjectId(id),
        );
        const recentlyActiveObjIds = [
            ...new Set([...activeObjIds, ...dormantCandidateObjIds]),
        ];

        const filter = {
            deleted: false,
            role: { $in: allowedRoles },
        };

        const [newActive, newInactive, active, dormant, churned] =
            await Promise.all([
                // NEW ACTIVE: createdAt >= 30d AND booked in last 30d
                users.countDocuments({
                    ...filter,
                    createdAt: { $gte: date_30d },
                    _id: { $in: activeObjIds },
                }),

                // NEW INACTIVE: createdAt >= 30d AND NOT booked in last 30d
                users.countDocuments({
                    ...filter,
                    createdAt: { $gte: date_30d },
                    _id: { $nin: activeObjIds },
                }),

                // ACTIVE/EXISTING: createdAt < 30d AND booked in last 30d
                users.countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $in: activeObjIds },
                }),

                // DORMANT: createdAt < 30d AND booked 30-90d ago (but not recently)
                users.countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $in: dormantCandidateObjIds, $nin: activeObjIds },
                }),

                // CHURNED: createdAt < 30d AND (no booking in last 90d OR never booked)
                users.countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $nin: recentlyActiveObjIds },
                }),
            ]);

        res.json({
            new_active: newActive,
            new_inactive: newInactive,
            active,
            dormant,
            churned,
            date_30d,
            date_90d,
        });
    } catch (err) {
        console.error("Segments error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/segments/stream (SSE) ─────────────────────────────────────────
router.get("/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (key, value) => {
        res.write(`data: ${JSON.stringify({ key, value })}\n\n`);
    };

    try {
        const db = global.cmsDb;
        const users = db.collection("users");
        const bookings = db.collection("chargerbookings");
        const { date_30d, date_90d } = getDates();

        const roleParam = req.query.role;
        let allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        if (roleParam) {
            const roles = roleParam.split(",");
            allowedRoles = [];
            if (roles.includes("customer")) allowedRoles.push("customer");
            if (roles.includes("fleet")) allowedRoles.push("fleet_owner", "fleet_member");
            if (allowedRoles.length === 0) allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        }

        const [activeIds, dormantCandidateIds] = await Promise.all([
            bookings.distinct("customer_user_booked", {
                status: "completed",
                payment_status: "done",
                $expr: { $gt: ["$meterstop", "$meterstart"] },
                updatedAt: { $gte: date_30d },
            }),
            bookings.distinct("customer_user_booked", {
                status: "completed",
                payment_status: "done",
                $expr: { $gt: ["$meterstop", "$meterstart"] },
                updatedAt: { $gte: date_90d, $lt: date_30d },
            }),
        ]);
        const activeObjIds = activeIds.map(
            (id) => new mongoose.Types.ObjectId(id),
        );
        const dormantCandidateObjIds = dormantCandidateIds.map(
            (id) => new mongoose.Types.ObjectId(id),
        );
        const recentlyActiveObjIds = [
            ...new Set([...activeObjIds, ...dormantCandidateObjIds]),
        ];

        const filter = {
            deleted: false,
            role: { $in: allowedRoles },
        };

        const promises = [
            users
                .countDocuments({
                    ...filter,
                    createdAt: { $gte: date_30d },
                    _id: { $in: activeObjIds },
                })
                .then((v) => send("new_active", v)),
            users
                .countDocuments({
                    ...filter,
                    createdAt: { $gte: date_30d },
                    _id: { $nin: activeObjIds },
                })
                .then((v) => send("new_inactive", v)),
            users
                .countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $in: activeObjIds },
                })
                .then((v) => send("active", v)),
            users
                .countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $in: dormantCandidateObjIds, $nin: activeObjIds },
                })
                .then((v) => send("dormant", v)),
            users
                .countDocuments({
                    ...filter,
                    createdAt: { $lt: date_30d },
                    _id: { $nin: recentlyActiveObjIds },
                })
                .then((v) => send("churned", v)),
        ];

        await Promise.all(promises);
        res.write(
            `data: ${JSON.stringify({ key: "__done__", value: true })}\n\n`,
        );
        res.end();
    } catch (err) {
        console.error("Segments stream error:", err);
        res.write(
            `data: ${JSON.stringify({ key: "__error__", value: err.message })}\n\n`,
        );
        res.end();
    }
});

module.exports = router;
