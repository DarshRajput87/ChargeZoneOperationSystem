const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
    try {
        const db = global.cmsDb;
        const bookings = db.collection("chargerbookings");
        const invoices = db.collection("invoices");
        const users = db.collection("users");

        const roleParam = req.query.role;
        let allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        if (roleParam) {
            const roles = roleParam.split(",");
            allowedRoles = [];
            if (roles.includes("customer")) allowedRoles.push("customer");
            if (roles.includes("fleet")) allowedRoles.push("fleet_owner", "fleet_member");
            if (allowedRoles.length === 0) allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        }

        // Pre-fetch user IDs that match the role filter
        const allowedUserIds = await users.distinct("_id", {
            role: { $in: allowedRoles },
            deleted: false
        });

        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const now = new Date();
        const now_ist = new Date(now.getTime() + IST_OFFSET);
        
        const getISTStartOfDay = (date) => {
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        };

        const today_start_ist = getISTStartOfDay(now_ist);
        
        // Daily
        const d1 = new Date(today_start_ist.getTime() - IST_OFFSET); // Today Start UTC
        const d2 = new Date(d1.getTime() - 24 * 60 * 60 * 1000); // Yesterday Start UTC

        // Weekly (Monday Start)
        const cw_start_ist = new Date(today_start_ist);
        const day = cw_start_ist.getUTCDay();
        const diff = (day === 0 ? 6 : day - 1);
        cw_start_ist.setUTCDate(cw_start_ist.getUTCDate() - diff);
        const w1 = new Date(cw_start_ist.getTime() - IST_OFFSET); // Current Week Start UTC
        const w2 = new Date(w1.getTime() - 7 * 24 * 60 * 60 * 1000); // Previous Week Start UTC

        // Monthly
        const cm_start_ist = new Date(today_start_ist);
        cm_start_ist.setUTCDate(1);
        const m1 = new Date(cm_start_ist.getTime() - IST_OFFSET); // Current Month Start UTC
        
        const pm_start_ist = new Date(cm_start_ist);
        pm_start_ist.setUTCMonth(pm_start_ist.getUTCMonth() - 1);
        const m2 = new Date(pm_start_ist.getTime() - IST_OFFSET); // Previous Month Start UTC

        const getStatsPipe = (start, end) => [
            {
                $match: {
                    updatedAt: { $gte: start, $lt: end },
                    status: "completed",
                    payment_status: "done"
                },
            },
            {
                $project: {
                    customer_user_booked: 1,
                    meterstop: 1,
                    meterstart: 1,
                    invoice: { $toObjectId: "$invoice" }
                }
            },
            {
                $lookup: {
                    from: "invoices",
                    localField: "invoice",
                    foreignField: "_id",
                    as: "invoice_doc"
                }
            },
            {
                $addFields: {
                    units_raw: { $subtract: ["$meterstop", "$meterstart"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total_sessions: { $sum: 1 },
                    successful_sessions: {
                        $sum: { $cond: [{ $gt: ["$units_raw", 0] }, 1, 0] }
                    },
                    total_units: {
                        $sum: {
                            $cond: [
                                { $gt: ["$units_raw", 0] },
                                { $divide: ["$units_raw", 1000] },
                                0
                            ]
                        }
                    },
                    total_revenue: {
                        $sum: {
                            $cond: [
                                { $gt: ["$units_raw", 0] },
                                { $ifNull: [{ $arrayElemAt: ["$invoice_doc.total_amount", 0] }, 0] },
                                0
                            ]
                        }
                    }
                }
            }
        ];

        // 1. Parallel Aggregations (Numerical Totals)
        const [bRes] = await Promise.all([
            bookings
                .aggregate([
                    { $match: { updatedAt: { $gte: m2, $lt: now }, customer_user_booked: { $in: allowedUserIds } } },
                    {
                        $facet: {
                            c1: getStatsPipe(d1, now),
                            p1: getStatsPipe(d2, d1),
                            c7: getStatsPipe(w1, now),
                            p7: getStatsPipe(w2, w1),
                            c30: getStatsPipe(m1, now),
                            p30: getStatsPipe(m2, m1),
                        },
                    },
                ])
                .toArray()
        ]);

        // 2. Parallel User ID Collection (Distinct Sliding Windows)
        const windows = [
            { k: "c1", s: d1, e: now },
            { k: "p1", s: d2, e: d1 },
            { k: "c7", s: w1, e: now },
            { k: "p7", s: w2, e: w1 },
            { k: "c30", s: m1, e: now },
            { k: "p30", s: m2, e: m1 },
        ];

        const userIdResults = await Promise.all(
            windows.map(async (w) => {
                const ids = await bookings.distinct("customer_user_booked", {
                    updatedAt: { $gte: w.s, $lt: w.e },
                    status: "completed",
                    payment_status: "done",
                    $expr: { $gt: ["$meterstop", "$meterstart"] }
                });
                return { k: w.k, ids };
            }),
        );

        // 3. Final assembly
        const b = bRes[0];
        const uMap = new Map(userIdResults.map((r) => [r.k, r.ids]));
        // validUserSet is now implicitly all user IDs in userIdResults since they were already filtered by allowedUserIds
        const validUserSet = new Set(allowedUserIds.map(id => id.toString()));

        const buildMetric = (key) => {
            const b0 = b[key][0] || { total_sessions: 0, successful_sessions: 0, total_units: 0, total_revenue: 0 };
            const ids = uMap.get(key) || [];

            // Fast intersection
            const activeCount = ids.reduce(
                (acc, id) => (validUserSet.has(id.toString()) ? acc + 1 : acc),
                0,
            );

            return {
                total_sessions: b0.total_sessions,
                successful_sessions: b0.successful_sessions,
                total_units: parseFloat((b0.total_units || 0).toFixed(1)),
                total_revenue: Math.round(b0.total_revenue || 0),
                active_users: activeCount,
                arpu: activeCount > 0 ? Math.round((b0.total_revenue || 0) / activeCount) : 0,
            };
        };

        const fetchAll = (cKey, pKey) => {
            const current = buildMetric(cKey);
            const previous = buildMetric(pKey);
            const calcTrend = (c, p) =>
                p === 0
                    ? c > 0
                        ? 100
                        : 0
                    : parseFloat((((c - p) / p) * 100).toFixed(1));

            return {
                current,
                previous,
                trends: {
                    total_sessions: calcTrend(
                        current.total_sessions,
                        previous.total_sessions,
                    ),
                    successful_sessions: calcTrend(
                        current.successful_sessions,
                        previous.successful_sessions,
                    ),
                    total_units: calcTrend(
                        current.total_units,
                        previous.total_units,
                    ),
                    total_revenue: calcTrend(
                        current.total_revenue,
                        previous.total_revenue,
                    ),
                    active_users: calcTrend(
                        current.active_users,
                        previous.active_users,
                    ),
                    arpu: calcTrend(current.arpu, previous.arpu),
                },
            };
        };

        res.json({
            daily: fetchAll("c1", "p1"),
            weekly: fetchAll("c7", "p7"),
            monthly: fetchAll("c30", "p30"),
        });
    } catch (err) {
        console.error("Metrics error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
