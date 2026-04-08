const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// GET /api/compare?startA=ISO&endA=ISO&startB=ISO&endB=ISO&granularity=day|week|month
router.get("/", async (req, res) => {
    try {
        const db = global.cmsDb;
        const bookings = db.collection("chargerbookings");
        const invoices = db.collection("invoices");
        const users = db.collection("users");

        const { startA, endA, startB, endB, granularity = "day", role } = req.query;
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;

        if (!startA || !endA || !startB || !endB) {
            return res
                .status(400)
                .json({ error: "startA, endA, startB, endB are required" });
        }

        let allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        if (role) {
            const roles = role.split(",");
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

        const parseISTTime = (d, isEnd) => {
            let isoStr = d;
            if (isoStr.length === 10) {
                isoStr += isEnd ? "T23:59:59.999Z" : "T00:00:00.000Z";
            } else if (isoStr.length === 16) {
                isoStr += ":00.000Z";
            } else if (isoStr.length === 19) {
                isoStr += ".000Z";
            } else if (isoStr.endsWith("Z")) {
                return new Date(new Date(isoStr).getTime());
            }

            if (!isoStr.endsWith("Z")) {
                isoStr += "Z";
            }

            return new Date(new Date(isoStr).getTime() - IST_OFFSET);
        };

        const pA = {
            start: parseISTTime(startA, false),
            end: parseISTTime(endA, true),
        };
        const pB = {
            start: parseISTTime(startB, false),
            end: parseISTTime(endB, true),
        };

        // Map granularity to MongoDB date grouping (using IST timezone for accurate calendar days)
        const getDateGroup = (granularity) => {
            const tz = "+05:30";
            if (granularity === "week") {
                return {
                    year: { $year: { date: "$updatedAt", timezone: tz } },
                    week: { $isoWeek: { date: "$updatedAt", timezone: tz } },
                };
            }
            if (granularity === "month") {
                return {
                    year: { $year: { date: "$updatedAt", timezone: tz } },
                    month: { $month: { date: "$updatedAt", timezone: tz } },
                };
            }
            return {
                year: { $year: { date: "$updatedAt", timezone: tz } },
                month: { $month: { date: "$updatedAt", timezone: tz } },
                day: { $dayOfMonth: { date: "$updatedAt", timezone: tz } },
            };
        };


        const buildSeriesPipe = (start, end) => [
            {
                $match: {
                    updatedAt: { $gte: start, $lte: end },
                    status: "completed",
                    payment_status: "done",
                    customer_user_booked: { $in: allowedUserIds }
                },
            },
            {
                $project: {
                    customer_user_booked: 1,
                    meterstop: 1,
                    meterstart: 1,
                    updatedAt: 1,
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
                    _id: getDateGroup(granularity),
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
                    },
                    user_ids: {
                        $addToSet: {
                            $cond: [{ $gt: ["$units_raw", 0] }, "$customer_user_booked", "$$REMOVE"]
                        }
                    },
                },
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1,
                    "_id.week": 1,
                },
            },
        ];

        // Run aggregations in parallel
        const [seriesA, seriesB] = await Promise.all([
            bookings.aggregate(buildSeriesPipe(pA.start, pA.end)).toArray(),
            bookings.aggregate(buildSeriesPipe(pB.start, pB.end)).toArray(),
        ]);

        // Collect all user IDs across both periods for one batch validation
        // (Wait, since we already filtered by allowedUserIds, we implicitly have valid user IDs)
        const validSet = new Set(allowedUserIds.map(id => id.toString()));

        const makeLabel = (id) => {
            if (id.day)
                return `${id.year}-${String(id.month).padStart(2, "0")}-${String(id.day).padStart(2, "0")}`;
            if (id.week)
                return `${id.year}-W${String(id.week).padStart(2, "0")}`;
            return `${id.year}-${String(id.month).padStart(2, "0")}`;
        };

        const enrichSeries = (series) => {
            return series.map((row) => {
                const label = makeLabel(row._id);
                const activeUsers = (row.user_ids || []).filter((id) =>
                    validSet.has(id.toString()),
                ).length;

                return {
                    label,
                    total_sessions: row.total_sessions || 0,
                    successful_sessions: row.successful_sessions || 0,
                    total_units: parseFloat((row.total_units || 0).toFixed(1)),
                    total_revenue: Math.round(row.total_revenue || 0),
                    active_users: activeUsers,
                    arpu:
                        activeUsers > 0 ? Math.round((row.total_revenue || 0) / activeUsers) : 0,
                };
            });
        };

        const calculateSummary = (series) => {
            const total_sessions = series.reduce((acc, row) => acc + (row.total_sessions || 0), 0);
            const successful_sessions = series.reduce((acc, row) => acc + (row.successful_sessions || 0), 0);
            const total_units = parseFloat(series.reduce((acc, row) => acc + (row.total_units || 0), 0).toFixed(1));
            const total_revenue = Math.round(series.reduce((acc, row) => acc + (row.total_revenue || 0), 0));
            
            const allPeriodUsers = new Set();
            series.forEach(row => {
                (row.user_ids || []).forEach(id => {
                    if (validSet.has(id.toString())) allPeriodUsers.add(id.toString());
                });
            });
            const active_users = allPeriodUsers.size;
            const arpu = active_users > 0 ? Math.round(total_revenue / active_users) : 0;

            return {
                total_sessions,
                successful_sessions,
                total_units,
                total_revenue,
                active_users,
                arpu
            };
        };

        res.json({
            periodA: enrichSeries(seriesA),
            periodB: enrichSeries(seriesB),
            summary: {
                periodA: calculateSummary(seriesA),
                periodB: calculateSummary(seriesB)
            }
        });
    } catch (err) {
        console.error("Compare error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
