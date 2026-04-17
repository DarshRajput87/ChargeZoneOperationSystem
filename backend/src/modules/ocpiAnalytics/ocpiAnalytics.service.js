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
// ✅ UTILS
// ================================
const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    
    // Handle DD-MM-YYYY -> YYYY-MM-DD
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[2]?.length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (parts[0]?.length === 4) return dateStr;
    }
    
    // If it's already a valid ISO string or other date string, return the YYYY-MM-DD part
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}
    
    return dateStr;
};

// ================================
// ✅ UNIFIED SUCCESS LOGIC (Source of Truth)
// ================================
const SUCCESS_CODES = [1000, 2000, 2001, 2002];

// Condition that evaluates to TRUE (boolean) if a record is successful
const isSuccessCond = {
    $cond: [
        { $eq: [{ $ifNull: ["$ocpiCredential", null] }, null] },
        // Non-OCPI logic
        { $and: [{ $gte: ["$response.status", 200] }, { $lt: ["$response.status", 300] }] },
        // OCPI Logic (Optimistic OR: Matches either body or data status codes)
        {
            $or: [
                { $in: ["$response.body.status_code", SUCCESS_CODES] },
                { $in: ["$response.data.status_code", SUCCESS_CODES] }
            ]
        }
    ]
};

// Numeric version for $sum operations
const isSuccessExpr = { $cond: [isSuccessCond, 1, 0] };

// ================================
// 📦 MODULE LIST (Scatter Plot Support)
// ================================
const MODULE_LIST = [
    "cdrs",
    "cdrs-emsp",
    "commands",
    "commands-emsp",
    "credentials",
    "endpoints",
    "locations",
    "sessions",
    "sessions-emsp",
    "singleversion",
    "tariff",
    "tariffs",
    "tokens"
];

// ================================
// 🔵 SCATTER DATA TRANSFORMER (O(n) over aggregated data only)
// ================================
function buildScatterData(aggregatedData) {
    const scatter = [];
    for (const item of aggregatedData) {
        for (const module of MODULE_LIST) {
            const value = item[module] || 0;
            if (value > 0) {
                scatter.push({
                    time: item.time,
                    module,
                    party_id: item.party_id,
                    role: item.role,
                    value
                });
            }
        }
    }
    return scatter;
}

// ================================
// 🔍 FILTER BUILDER (Native Performance Mode)
// ================================
const buildMatch = async (db, { module, ocpiCredential, party_id, tenant_id, booking_type, date, status }) => {
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

    const selectedDate = normalizeDate(date);
    const { start, end } = getDayRange(selectedDate);
    match.createdAt = { $gte: start, $lte: end };

    // 🔥 Native Status Filtration Hook (Using the exactly unified criteria)
    if (status && status !== "all") {
        const ocpiSucc = {
            ocpiCredential: { $exists: true, $ne: null },
            $or: [
                { "response.body.status_code": { $in: SUCCESS_CODES } },
                { "response.data.status_code": { $in: SUCCESS_CODES } }
            ]
        };
        const nonOcpiSucc = {
            ocpiCredential: null,
            "response.status": { $gte: 200, $lt: 300 }
        };

        if (status === "success") {
            match.$and = [{ $or: [ocpiSucc, nonOcpiSucc] }];
        } else if (status === "failed") {
            match.$nor = [ocpiSucc, nonOcpiSucc];
        }
    }

    return match;
};

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
// 📋 1. LOGS API (Index Speed Priority)
// ================================
const getLogs = async (db, filters) => {
    const { limit = 20, lastCreatedAt } = filters;
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const match = await buildMatch(db, filters);

    if (lastCreatedAt) {
        match.createdAt = { ...match.createdAt, $lt: new Date(lastCreatedAt) };
    }

    // Pipeline rearranged: $match -> $sort -> $limit -> (THEN map virtual structures $addFields ONLY on the 20 resultant docs)
    const pipeline = [
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $limit: safeLimit },
        {
            $addFields: {
                status_code: statusCodeExpr,
                status_message: statusMessageExpr,
                isSuccess: isSuccessExpr       
            }
        },
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

    // Node.js Side Fast Lookup Post-Filtration
    const chargerIds = logs.map(l => l.charger).filter(Boolean);
    const credentialIds = logs.map(l => l.ocpiCredential).filter(Boolean);

    const chargers = await db.collection("chargers").find({ _id: { $in: chargerIds } }).project({ charger_id: 1 }).toArray();
    const credentials = await db.collection("ocpicredentials").find({ _id: { $in: credentialIds } }).project({ partner_name: 1, party_id: 1, partyId: 1, roles: 1 }).toArray();

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
// 📊 2. UNIFIED DASHBOARD STATS ($facet aggregation)
// ================================
const getDashboardStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    // This performs all 4 module combinations in one single concurrent scan sweep across the massive collection
    const pipeline = [
        { $match: match },
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            success: { $sum: isSuccessExpr }
                        }
                    }
                ],
                modules: [
                    {
                        $group: {
                            _id: "$module",
                            total: { $sum: 1 },
                            success: { $sum: isSuccessExpr }
                        }
                    }
                ],
                partners_grouped: [
                    {
                        $group: {
                            _id: "$ocpiCredential", // Lightning grouping strictly on Indexed IDs first -> bypassing 1.2M subdocument loop!
                            total: { $sum: 1 },
                            success: { $sum: isSuccessExpr }
                        }
                    }
                ],
                failures: [
                    { $match: { $expr: { $eq: [isSuccessExpr, 0] } } }, // In-stream evaluation specifically for parsing out error URIs
                    {
                        $group: {
                            _id: "$url",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]
            }
        }
    ];

    const result = await db.collection("ocpiapiloggers").aggregate(pipeline).toArray();
    const facetData = result[0];

    // Secondary DB Node.js memory injection for partners payload (~50 lookups rather than 1.2 Million Lookups!)
    const credentialIds = facetData.partners_grouped.map(p => p._id).filter(Boolean);
    const credentials = await db.collection("ocpicredentials")
        .find({ _id: { $in: credentialIds } })
        .project({ partner_name: 1, party_id: 1, partyId: 1, roles: 1 })
        .toArray();

    const credMap = {};
    credentials.forEach(c => {
        const role = Array.isArray(c.roles) ? c.roles[0] : null;
        credMap[c._id.toString()] = {
            partner_name: c.partner_name ?? role?.business_details?.name ?? null,
            party_id: c.party_id ?? c.partyId ?? role?.party_id ?? null
        };
    });

    const partnerStatsMap = new Map();
    facetData.partners_grouped.forEach(p => {
        if (!p._id) return;
        const cred = credMap[p._id.toString()];
        if (cred) {
            const key = `${cred.partner_name}_${cred.party_id}`;
            if (!partnerStatsMap.has(key)) {
                partnerStatsMap.set(key, { _id: { partner_name: cred.partner_name, party_id: cred.party_id }, total: 0, success: 0 });
            }
            const agg = partnerStatsMap.get(key);
            agg.total += p.total;
            agg.success += p.success;
        }
    });

    return {
        summary: facetData.summary,
        modules: facetData.modules,
        partners: Array.from(partnerStatsMap.values()),
        failures: facetData.failures
    };
};

// ================================
// 📈 3. TIME SERIES STATS (100% Accuracy & Normalization)
// ================================
const getTimeSeriesStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: {
                    hour: {
                        $dateToString: {
                            format: "%H:00",
                            date: "$createdAt",
                            timezone: "Asia/Kolkata"
                        }
                    },
                    module: "$module"
                },
                count: { $sum: 1 },
                successCount: { $sum: isSuccessExpr }
            }
        },
        { $sort: { "_id.hour": 1 } }
    ];

    const results = await db.collection("ocpiapiloggers").aggregate(pipeline).toArray();

    // 1. Identify ALL unique modules present in this dataset
    const allModules = new Set(["locations", "sessions", "cdrs", "commands", "tokens"]); // Baseline common modules
    results.forEach(r => {
        if (r._id.module) allModules.add(r._id.module);
    });
    const moduleList = Array.from(allModules);

    // 2. Generate full day buckets (Gap Filler 00:00 - 23:00)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const currentHour = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', timeZone: 'Asia/Kolkata' });

    const selectedDate = normalizeDate(filters.date);
    let lastHour = 23;
    if (selectedDate === today) {
        lastHour = parseInt(currentHour);
    }

    const timeSeries = [];
    for (let i = 0; i <= lastHour; i++) {
        const hourStr = `${String(i).padStart(2, "0")}:00`;
        
        // Initialize bucket with ALL required keys (Normalization Rule)
        const bucket = {
            time: hourStr,
            total: 0,
            success: 0,
            failed: 0
        };
        // Pre-fill all modules with 0
        moduleList.forEach(m => { bucket[m] = 0; });

        // Filter results for this specific hour
        const hourResults = results.filter(r => r._id.hour === hourStr);
        
        hourResults.forEach(res => {
            const modName = res._id.module || "unknown";
            const success = res.successCount || 0;
            const total = res.count || 0;
            const failed = total - success;

            bucket[modName] = (bucket[modName] || 0) + total;
            bucket.total += total;
            bucket.success += success;
            bucket.failed += failed;
        });

        timeSeries.push(bucket);
    }

    return timeSeries;
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
// 📈 8. PARTY TIME SERIES + SCATTER (Non-Breaking Extension)
// ================================
// ⚡ PERFORMANCE: NO $lookup! Group by indexed ocpiCredential ID first,
// then resolve party_id/role in Node.js memory (~50 lookups vs 1.2M joins).
const getPartyTimeSeriesStats = async (db, filters) => {
    const match = await buildMatch(db, filters);

    // Force OCPI-only (party data requires credentials)
    if (!match.ocpiCredential) {
        match.ocpiCredential = { $exists: true, $ne: null };
    }

    // STEP 1: Lightning-fast aggregation grouped by indexed ocpiCredential ID
    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: {
                    hour: {
                        $dateToString: {
                            format: "%H:00",
                            date: "$createdAt",
                            timezone: "Asia/Kolkata"
                        }
                    },
                    credId: "$ocpiCredential",
                    module: "$module"
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.hour": 1 } }
    ];

    const results = await db.collection("ocpiapiloggers").aggregate(pipeline).toArray();

    // STEP 2: Collect unique credential IDs and resolve party metadata in Node.js
    const credIds = [...new Set(results.map(r => r._id.credId).filter(Boolean))];
    const credentials = await db.collection("ocpicredentials")
        .find({ _id: { $in: credIds } })
        .project({ partner_name: 1, party_id: 1, partyId: 1, roles: 1 })
        .toArray();

    const credMap = {};
    credentials.forEach(c => {
        const role = Array.isArray(c.roles) ? c.roles[0] : null;
        credMap[c._id.toString()] = {
            party_id: c.party_id ?? c.partyId ?? role?.party_id ?? "UNKNOWN",
            role: c.role ?? role?.role ?? "UNKNOWN",
            partner_name: c.partner_name ?? role?.business_details?.name ?? null
        };
    });

    // STEP 3: Pivot results into {hour, party_id, role} with module-wise counts
    const pivotMap = new Map(); // key = "hour|party_id|role"

    results.forEach(r => {
        const credInfo = credMap[r._id.credId?.toString()] || { party_id: "UNKNOWN", role: "UNKNOWN", partner_name: "UNKNOWN" };
        const key = `${r._id.hour}|${credInfo.party_id}|${credInfo.role}`;

        if (!pivotMap.has(key)) {
            pivotMap.set(key, {
                time: r._id.hour,
                party_id: credInfo.party_id,
                role: credInfo.role,
                partner_name: credInfo.partner_name || credInfo.party_id,
                total: 0,
                locations: 0, sessions: 0, commands: 0, cdrs: 0,
                tokens: 0, tariffs: 0, tariff: 0, credentials: 0,
                endpoints: 0, "cdrs-emsp": 0, "commands-emsp": 0,
                "sessions-emsp": 0, singleversion: 0
            });
        }

        const bucket = pivotMap.get(key);
        bucket.total += r.count;
        const mod = r._id.module || "unknown";
        if (bucket.hasOwnProperty(mod)) {
            bucket[mod] += r.count;
        }
    });

    const flatData = Array.from(pivotMap.values()).sort((a, b) => a.time.localeCompare(b.time));

    return {
        timeSeries: flatData,
        scatterData: buildScatterData(flatData)
    };
};

// ================================
// 🚀 EXPORTS
// ================================
module.exports = {
    getLogs,
    getDashboardStats,
    getTimeSeriesStats,
    getPartyTimeSeriesStats,
    getAllParties,
    getTenants
};