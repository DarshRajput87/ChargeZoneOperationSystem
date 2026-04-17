// ─── utils/dataFormatter.js ──────────────────────────────────────────────────
// Transforms raw API responses into chart-ready data structures.
// NO business logic duplication. NO extra API calls.

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const MODULES = [
    'cdrs', 'cdrs-emsp', 'commands', 'commands-emsp', 'credentials',
    'endpoints', 'locations', 'sessions', 'sessions-emsp', 'singleversion',
    'tariff', 'tariffs', 'tokens'
];

export const CHART_PALETTE = [
    "#00e5a0", "#00c8ff", "#a78bfa", "#ffb340", "#ff4d6a",
    "#60a5fa", "#f472b6", "#34d399", "#fb923c", "#e879f9"
];

export const COLORS = {
    success: "#00e5a0",
    failed: "#ff4d6a",
    amber: "#ffb340",
    cyan: "#00c8ff",
    purple: "#a78bfa",
    blue: "#60a5fa",
};

// fmt helper
export const fmt = (n) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
        : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
            : String(n ?? 0);

export const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : "0.0");

// ── KPI summary
export const formatSummary = (summary) => {
    const total = summary?.total ?? 0;
    const success = summary?.success ?? 0;
    const failed = total - success;
    const rate = parseFloat(pct(success, total));
    return { total, success, failed, rate };
};

// ── Partner chart data (top N)
export const formatPartners = (partners, top = 10) =>
    partners
        .map(p => ({
            name: p._id?.partner_name || p._id?.party_id || "Unknown",
            success: p.success || 0,
            failed: (p.total || 0) - (p.success || 0),
            total: p.total || 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, top);

// ── Module chart data
export const formatModules = (modules) =>
    MODULES.map(m => {
        const found = modules.find(x => x._id === m) || { success: 0, total: 0 };
        return {
            name: m,
            success: found.success || 0,
            failed: (found.total || 0) - (found.success || 0),
            total: (found.total || 0),
        };
    }).filter(m => m.success + m.failed > 0);

// ── Pie data: status split
export const formatPieStatus = (summary) => {
    const { success, failed } = formatSummary(summary);
    return [
        { name: "Success", value: success, color: COLORS.success },
        { name: "Failed", value: failed, color: COLORS.failed },
    ];
};

// ── Pie data: module distribution
export const formatPieModules = (modules) =>
    modules
        .map((m, i) => ({ name: m._id, value: m.total || 0, color: CHART_PALETTE[i % CHART_PALETTE.length] }))
        .filter(m => m.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

// ── Hourly trend from logs
export const formatHourlyTrend = (logs) => {
    const buckets = HOURS.map(h => ({
        hour: `${String(h).padStart(2, "0")}:00`,
        success: 0,
        failed: 0,
        total: 0,
    }));
    logs.forEach(log => {
        const h = new Date(log.createdAt).getHours();
        buckets[h].total++;
        if (log.isSuccess === 1) buckets[h].success++;
        else buckets[h].failed++;
    });
    return buckets;
};

// ── Heatmap: module × hour failure density
export const formatHeatmap = (logs) => {
    const map = {};
    logs.forEach(log => {
        if (log.isSuccess === 1) return;
        const h = new Date(log.createdAt).getHours();
        const m = log.module || "unknown";
        map[`${h}_${m}`] = (map[`${h}_${m}`] || 0) + 1;
    });
    const mods = [...new Set(logs.map(l => l.module).filter(Boolean))].slice(0, 10);
    const rows = [];
    mods.forEach(mod => {
        HOURS.forEach(h => {
            const count = map[`${h}_${mod}`] || 0;
            if (count > 0) rows.push({ module: mod, hour: h, count });
        });
    });
    return { rows, mods, hours: HOURS };
};

// ── Top failing client
export const getTopFailing = (partnerData) =>
    partnerData.reduce((acc, cur) => (!acc || cur.failed > acc.failed ? cur : acc), null);