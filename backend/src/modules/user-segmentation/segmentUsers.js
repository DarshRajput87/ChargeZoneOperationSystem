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

// GET /api/segments/:segment/users
router.get("/:segment/users", async (req, res) => {
    try {
        const { segment } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const roleParam = req.query.role;
        const isExport = req.query.export === "true";

        const db = global.cmsDb;
        const users = db.collection("users");
        const bookings = db.collection("chargerbookings");
        const { date_30d, date_90d } = getDates();

        let allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        if (roleParam) {
            const roles = roleParam.split(",");
            allowedRoles = [];
            if (roles.includes("customer")) allowedRoles.push("customer");
            if (roles.includes("fleet")) allowedRoles.push("fleet_owner", "fleet_member");
            if (allowedRoles.length === 0) allowedRoles = ["customer", "fleet_owner", "fleet_member"];
        }

        // 1. Get exact sliding window successful IDs
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

        const activeObjIds = activeIds.map((id) => new mongoose.Types.ObjectId(id));
        const dormantCandidateObjIds = dormantCandidateIds.map((id) => new mongoose.Types.ObjectId(id));
        const recentlyActiveObjIds = [...new Set([...activeObjIds, ...dormantCandidateObjIds])];

        let matchFilter = {
            deleted: false,
            role: { $in: allowedRoles },
        };

        // Inject segmentation rules
        switch (segment) {
            case "new_active":
                matchFilter.createdAt = { $gte: date_30d };
                matchFilter._id = { $in: activeObjIds };
                break;
            case "new_inactive":
                matchFilter.createdAt = { $gte: date_30d };
                matchFilter._id = { $nin: activeObjIds };
                break;
            case "active":
                matchFilter.createdAt = { $lt: date_30d };
                matchFilter._id = { $in: activeObjIds };
                break;
            case "dormant":
                matchFilter.createdAt = { $lt: date_30d };
                matchFilter._id = { $in: dormantCandidateObjIds, $nin: activeObjIds };
                break;
            case "churned":
                matchFilter.createdAt = { $lt: date_30d };
                matchFilter._id = { $nin: recentlyActiveObjIds };
                break;
            default:
                return res.status(400).json({ error: "Invalid segment" });
        }

        // Add search filtering if applicable
        if (search) {
            let orQueries = [];
            
            // Text search on phone
            orQueries.push({ phone: { $regex: search, $options: "i" } });

            // ID matching (if valid ObjectId)
            if (mongoose.Types.ObjectId.isValid(search)) {
                orQueries.push({ _id: new mongoose.Types.ObjectId(search) });
            }
            
            matchFilter.$or = orQueries;
        }

        // Calculate Totals and retrieve paginated list
        const total = await users.countDocuments(matchFilter);
        
        let targetUsersCursor = users.find(matchFilter);
        if (!isExport) {
            targetUsersCursor = targetUsersCursor.skip((page - 1) * limit).limit(limit);
        }
        
        const targetUsers = await targetUsersCursor.toArray();

        // Prepare aggregation to pull bookings data for these exact users
        const targetObjIds = targetUsers.map(u => u._id);
        
        const bookingsAgg = await bookings.aggregate([
            {
                $match: {
                    customer_user_booked: { $in: targetObjIds },
                    status: "completed",
                    payment_status: "done",
                    $expr: { $gt: ["$meterstop", "$meterstart"] }
                }
            },
            {
                $group: {
                    _id: "$customer_user_booked",
                    sessions_all_time: { $sum: 1 },
                    sessions_30d: { 
                        $sum: { $cond: [{ $gte: ["$updatedAt", date_30d] }, 1, 0] } 
                    },
                    sessions_90d: { 
                        $sum: { $cond: [{ $gte: ["$updatedAt", date_90d] }, 1, 0] } 
                    },
                    total_estimated_amount: { 
                        $sum: { $ifNull: ["$estimated_amount", 0] } 
                    },
                    last_booking_date: { $max: "$updatedAt" }
                }
            }
        ]).toArray();

        // Convert the Aggregation results to a fast dictionary keyed by User ID
        const bMap = new Map();
        bookingsAgg.forEach(b => {
             bMap.set(b._id.toString(), b);
        });

        const rightNow = new Date();
        const displaySegment = segment.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Process final document combining User model + Booking stats
        const finalResults = targetUsers.map((user, index) => {
            const bData = bMap.get(user._id.toString()) || {
                sessions_all_time: 0,
                sessions_30d: 0,
                sessions_90d: 0,
                total_estimated_amount: 0,
                last_booking_date: null
            };

            return {
                sr_no: !isExport ? ((page - 1) * limit) + (index + 1) : index + 1,
                user_id: user._id.toString(),
                phone_no: user.phone || "N/A",
                sessions_30d: bData.sessions_30d,
                sessions_90d: bData.sessions_90d,
                sessions_all_time: bData.sessions_all_time,
                total_estimated_amount: bData.total_estimated_amount,
                lifecycle_segment: displaySegment,
                last_booking_date: bData.last_booking_date,
                last_segmented_date: rightNow
            };
        });

        res.json({
            data: finalResults,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Segment users error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
