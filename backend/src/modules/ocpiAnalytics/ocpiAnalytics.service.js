const { ObjectId } = require("mongodb");

// ================================
// 📅 IST DAY RANGE
// ================================
const getDayRange = (dateString) => {
    const start = new Date(`${dateString}T00:00:00.000+05:30`);
    const end = new Date(`${dateString}T23:59:59.999+05:30`);
    return { start, end };
};

// ================================
// 🔍 FILTER BUILDER
// ================================
const buildMatch = async (db, { module, ocpiCredential, party_id, tenant_id, booking_type, date }) => {
    const match = {};

    if (module) match.module = module;

    let credMatch = null;
    if (party_id || tenant_id) {
        let query = {};
        if (party_id) {
            const regexParty = new RegExp(`^${party_id}$`, "i");
            query.$or = [
                { party_id: regexParty },
                { partyId: regexParty },
                { "roles.0.party_id": regexParty },
                { "roles.party_id": regexParty }
            ];
        }
        if (tenant_id) {
            query.tenant = new ObjectId(tenant_id);
        }
        const credentials = await db.collection("ocpicredentials").find(query).project({ _id: 1 }).toArray();
        credMatch = { $in: credentials.map(c => c._id) };
    }

    if (credMatch) {
        match.ocpiCredential = credMatch;
    } else if (booking_type === "ocpi") {
        match.ocpiCredential = { $exists: true, $ne: null };
    } else if (booking_type === "non-ocpi") {
        match.ocpiCredential = null;
    } else if (ocpiCredential) {
        match.ocpiCredential = new ObjectId(ocpiCredential);
    }

    const selectedDate = date || new Date().toISOString().split("T")[0];
    const { start, end } = getDayRange(selectedDate);
    match.createdAt = { $gte: start, $lte: end };

    return match;
};

// ================================
// ✅ IS-SUCCESS EXPRESSION
//
// Rules:
//   OCPI     (ocpiCredential != null) → success if status_code === 1000
//   Non-OCPI (ocpiCredential == null) → success if HTTP status 200–299
// ================================
const isSuccessExpr = {
    $cond: {
        // Is this a Non-OCPI record? (no credential linked)
        if: { $eq: [{ $ifNull: ["$ocpiCredential", null] }, null] },
        then: {
            // Non-OCPI: HTTP 2xx means success
            $cond: {
                if: {
                    $and: [
                        { $gte: [{ $ifNull: ["$response.status", 0] }, 200] },
                        { $lt: [{ $ifNull: ["$response.status", 0] }, 300] }
                    ]
                },
                then: 1,
                else: 0
            }
        },
        else: {
            // OCPI: status_code 1000, 2000, 2001, 2002 are success
            $cond: {
                if: {
                    $in: [
                        { $ifNull: ["$response.body.status_code", { $ifNull: ["$response.data.status_code", null] }] },
                        [1000, 2000, 2001, 2002]
                    ]
                },
                then: 1,
                else: 0
            }
        }

    }
};

// ================================
// 📊 STATUS CODE EXPRESSION
// ================================
const statusCodeExpr = {
    $ifNull: [
        "$response.body.status_code",
        { $ifNull: ["$response.data.status_code", "$response.status"] }
    ]
};

const statusMessageExpr = {
    $ifNull: [
        "$response.body.status_message",
        { $ifNull: ["$response.data.status_message", "$response.message"] }
    ]
};

// ================================
// 🔗 PIPELINES
// ================================
const basePipeline = (match) => [
    { $match: match },

    {
        $lookup: {
            from: "chargers",
            localField: "charger",
            foreignField: "_id",
            as: "chargerData"
        }
    },
    { $unwind: { path: "$chargerData", preserveNullAndEmptyArrays: true } },

    {
        $lookup: {
            from: "ocpicredentials",
            localField: "ocpiCredential",
            foreignField: "_id",
            as: "credential"
        }
    },
    { $unwind: { path: "$credential", preserveNullAndEmptyArrays: true } },

    {
        $addFields: {
            charger_id: "$chargerData.charger_id",
            party_id: "$credential.party_id",
            partner_name: "$credential.partner_name",
            status_code: statusCodeExpr,
            status_message: statusMessageExpr,
            isSuccess: isSuccessExpr       // ← booking-type-aware
        }
    }
];

const lightPipeline = (match) => [
    { $match: match },
    {
        $addFields: {
            status_code: statusCodeExpr,
            status_message: statusMessageExpr,
            isSuccess: isSuccessExpr       // ← booking-type-aware
        }
    }
];

// ================================
// 🟢 STATUS FILTER STAGE
// ================================
const statusFilterStage = (status) => {
    if (status === "success") return [{ $match: { isSuccess: 1 } }];
    if (status === "failed") return [{ $match: { isSuccess: 0 } }];
    return [];
};

// ================================
// 📋 1. LOGS API
// ================================
const getLogs = async (db, filters) => {
    const { limit = 20, lastCreatedAt } = filters;
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const match = await buildMatch(db, filters);

    if (lastCreatedAt) {
        match.createdAt = { ...match.createdAt, $lt: new Date(lastCreatedAt) };
    }

    const pipeline = [
        ...lightPipeline(match),
        ...statusFilterStage(filters.status),
        { $sort: { createdAt: -1 } },
        { $limit: safeLimit },
        {
            $project: {
                module: 1,
                url: 1,
                charger: 1,
                ocpiCredential: 1,
                createdAt: 1,
                status_code: 1,
                status_message: 1,
                isSuccess: 1
            }
        }
    ];

    const logs = await db.collection("ocpiapiloggers").aggregate(pipeline).toArray();

    // Secondary lookup (lightweight — only for the page)
    const chargerIds = logs.map(l => l.charger).filter(Boolean);
    const credentialIds = logs.map(l => l.ocpiCredential).filter(Boolean);

    const chargers = await db.collection("chargers")
        .find({ _id: { $in: chargerIds } })
        .project({ charger_id: 1 })
        .toArray();

    const credentials = await db.collection("ocpicredentials")
        .find({ _id: { $in: credentialIds } })
        .project({ partner_name: 1, party_id: 1, partyId: 1, roles: 1 })
        .toArray();

    const chargerMap = {};
    chargers.forEach(c => { chargerMap[c._id.toString()] = c.charger_id; });

    const credentialMap = {};
    credentials.forEach(c => {
        const role = Array.isArray(c.roles) ? c.roles[0] : null;
        credentialMap[c._id.toString()] = {
            partner_name: c.partner_name ?? role?.business_details?.name ?? null,
            party_id: c.party_id ?? c.partyId ?? role?.party_id ?? null
        };
    });

    return logs.map(log => ({
        ...log,
        charger_id: chargerMap[log.charger?.toString()] || null,
        partner_name: credentialMap[log.ocpiCredential?.toString()]?.partner_name || null,
        party_id: credentialMap[log.ocpiCredential?.toString()]?.party_id || null
    }));
};

// ================================
// 📊 2. SUMMARY API
// ================================
const getSummary = async (db, filters) => {
    const match = await buildMatch(db, filters);

    const pipeline = [
        ...lightPipeline(match),
        ...statusFilterStage(filters.status),
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                success: { $sum: "$isSuccess" }
            }
        }
    ];

    return db.collection("ocpiapiloggers").aggregate(pipeline).toArray();
};

// ================================
// 📦 3. MODULE STATS
// ================================
const getModuleStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    const pipeline = [
        ...lightPipeline(match),
        ...statusFilterStage(filters.status),
        {
            $group: {
                _id: "$module",
                total: { $sum: 1 },
                success: { $sum: "$isSuccess" }
            }
        }
    ];

    return db.collection("ocpiapiloggers").aggregate(pipeline).toArray();
};

// ================================
// 🤝 4. PARTNER STATS
// ================================
const getPartnerStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    const pipeline = [
        ...basePipeline(match),
        ...statusFilterStage(filters.status),
        {
            $group: {
                _id: { partner_name: "$partner_name", party_id: "$party_id" },
                total: { $sum: 1 },
                success: { $sum: "$isSuccess" }
            }
        }
    ];

    return db.collection("ocpiapiloggers").aggregate(pipeline).toArray();
};

// ================================
// ⚠️ 5. FAILURE STATS
// ================================
const getFailureStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    const pipeline = [
        ...lightPipeline(match),
        ...statusFilterStage(filters.status),
        { $match: { isSuccess: 0 } },   // only actual failures (uses corrected isSuccess)
        {
            $group: {
                _id: "$url",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ];

    return db.collection("ocpiapiloggers").aggregate(pipeline).toArray();
};

// ================================
// 📋 6. ALL PARTIES API (Dropdown)
// ================================
const getAllParties = async (db) => {
    const creds = await db.collection("ocpicredentials")
        .find({ deleted: false })
        .project({ partner_name: 1, party_id: 1, partyId: 1, roles: 1, tenant: 1 })
        .toArray();

    const partyMap = new Map();
    creds.forEach(c => {
        const role = Array.isArray(c.roles) ? c.roles[0] : null;
        const partyId = c.party_id ?? c.partyId ?? role?.party_id ?? null;
        const partnerName = c.partner_name ?? role?.business_details?.name ?? null;
        if (partyId) {
            partyMap.set(partyId, { partner_name: partnerName || partyId, tenant: c.tenant });
        }
    });

    return Array.from(partyMap.entries())
        .map(([party_id, data]) => ({ party_id, partner_name: data.partner_name, tenant: data.tenant }))
        .sort((a, b) => a.partner_name.localeCompare(b.partner_name));
};

// ================================
// 🏢 7. TENANTS API
// ================================
const getTenants = async (db) => {
    const companies = await db.collection("companies")
        .find({ is_active: true })
        .project({ name: 1 })
        .toArray();
    return companies
        .map(c => ({ _id: c._id.toString(), name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

// ================================
// 🚀 EXPORTS
// ================================
module.exports = {
    getLogs,
    getSummary,
    getModuleStats,
    getPartnerStats,
    getFailureStats,
    getAllParties,
    getTenants
};