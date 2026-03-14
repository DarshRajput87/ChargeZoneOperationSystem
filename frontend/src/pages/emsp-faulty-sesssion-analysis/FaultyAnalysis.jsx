import { useEffect, useState, useMemo } from "react";
import "./FaultyAnalysis.css";

import {
    PieChart, Pie, Cell, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
    AreaChart, Area, ResponsiveContainer,
} from "recharts";

// ── Palette ─────────────────────────────────────────────
const C = ["#3b82f6", "#f97316", "#ef4444", "#22c55e", "#a855f7", "#06b6d4", "#ec4899"];

// Shorten long reason strings to a readable label
function shortReason(str = "") {
    const map = {
        "CDR Calculation Is Wrong": "CDR Wrong",
        "Energy Is Not Valid": "Energy Invalid",
        "Energy Is Not Valid, CDR Calculation Is Wrong": "Energy+CDR",
        "Unit Consumed Is More Than Vehicle Capacity": "Over Capacity",
        "Unit Consumed Is More Than Vehicle Capacity, CDR Calculation Is Wrong": "Over Cap+CDR",
        "Tariff has been changed after session completed": "Tariff Changed",
    };
    if (map[str]) return map[str];
    return str.length > 16 ? str.slice(0, 14) + "…" : str;
}

// ── Sub-components ───────────────────────────────────────

function FaultBadge({ value }) {
    const cls = value >= 4 ? "high" : value >= 2 ? "med" : "low";
    return <span className={`fault-badge ${cls}`}>{value}</span>;
}

const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="tooltip-value" style={{ color: p.color || "#60a5fa" }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
};

// ── Filter presets ───────────────────────────────────────
const PRESETS = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "Custom", value: "custom" },
];

// ── Main ─────────────────────────────────────────────────
export default function FaultyAnalysis() {

    const [recent, setRecent] = useState([]);

    // Filters
    const [parties, setParties] = useState([]);
    const [preset, setPreset] = useState("today");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        fetch("https://api.chargezoneops.online/api/faulty-analysis/recent")
            .then(r => r.json())
            .then(data => setRecent(data))
            .catch(() => { });
    }, []);

    const allParties = useMemo(
        () => [...new Set(recent.map(r => r.partyId).filter(Boolean))].sort(),
        [recent]
    );

    const { effFrom, effTo } = useMemo(() => {
        const now = new Date();
        if (preset === "today") {
            const s = new Date(now); s.setHours(0, 0, 0, 0);
            return { effFrom: s, effTo: now };
        }
        if (preset === "7d") {
            const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0);
            return { effFrom: s, effTo: now };
        }
        if (preset === "30d") {
            const s = new Date(now); s.setDate(s.getDate() - 30); s.setHours(0, 0, 0, 0);
            return { effFrom: s, effTo: now };
        }
        return { effFrom: dateFrom ? new Date(dateFrom) : null, effTo: dateTo ? new Date(dateTo) : null };
    }, [preset, dateFrom, dateTo]);

    const rows = useMemo(() => recent.filter(r => {
        const ts = new Date(r.created_at);
        if (effFrom && ts < effFrom) return false;
        if (effTo && ts > effTo) return false;
        if (parties.length && !parties.includes(r.partyId)) return false;
        return true;
    }), [recent, effFrom, effTo, parties]);

    // Derived charts
    const stationMap = useMemo(() => {
        const m = {};
        rows.forEach(r => {
            if (!m[r.station_name]) m[r.station_name] = { name: r.station_name, city: r.city || "—", faults: 0 };
            m[r.station_name].faults++;
        });
        return Object.values(m).sort((a, b) => b.faults - a.faults);
    }, [rows]);

    const partyDist = useMemo(() => {
        const m = {};
        rows.forEach(r => { if (r.partyId) m[r.partyId] = (m[r.partyId] || 0) + 1; });
        return Object.entries(m).map(([_id, faults]) => ({ _id, faults }));
    }, [rows]);

    const reasonDist = useMemo(() => {
        const m = {};
        rows.forEach(r => (r.faulty_reasons || []).forEach(reason => {
            m[reason] = (m[reason] || 0) + 1;
        }));
        return Object.entries(m)
            .map(([full, count]) => ({ full, short: shortReason(full), count }))
            .sort((a, b) => b.count - a.count);
    }, [rows]);

    const trendData = useMemo(() => {
        const m = {};
        rows.forEach(r => {
            const d = r.created_at?.slice(0, 10);
            if (d) m[d] = (m[d] || 0) + 1;
        });
        return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
            .map(([_id, faults]) => ({ _id, faults }));
    }, [rows]);

    const total = rows.length;
    const avgF = stationMap.length ? (total / stationMap.length).toFixed(1) : "0";
    const active = parties.length + (preset !== "today" ? 1 : 0);

    const toggleParty = p =>
        setParties(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

    const clearAll = () => { setParties([]); setPreset("today"); setDateFrom(""); setDateTo(""); };

    const ReasonTip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label" style={{ maxWidth: 220 }}>{d.full}</p>
                <p className="tooltip-value" style={{ color: payload[0].fill }}>
                    Count: {d.count}
                </p>
            </div>
        );
    };

    return (
        <div className="fault-dashboard">

            {/* ── HEADER ── */}
            <div className="dashboard-header">
                <div>
                    <h2 className="page-title">Fault Analytics</h2>
                    <p className="page-subtitle">
                        <span className="status-dot" />
                        Live monitoring · {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                        {active > 0 && (
                            <span style={{ color: "#60a5fa", marginLeft: 8 }}>
                                · {active} filter{active > 1 ? "s" : ""} active
                            </span>
                        )}
                    </p>
                </div>

                <button
                    className={`filter-toggle-btn ${panelOpen ? "active" : ""}`}
                    onClick={() => setPanelOpen(o => !o)}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filters
                    {active > 0 && <span className="filter-count-badge">{active}</span>}
                </button>
            </div>

            {/* ── FILTER PANEL ── */}
            <div className={`filter-panel ${panelOpen ? "open" : ""}`}>
                <div className="filter-grid">

                    <div className="filter-section">
                        <span className="filter-label">Time Range</span>
                        <div className="pill-row">
                            {PRESETS.map(p => (
                                <button key={p.value}
                                    className={`preset-pill ${preset === p.value ? "active" : ""}`}
                                    onClick={() => setPreset(p.value)}
                                >{p.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <div className="filter-label-row">
                            <span className="filter-label">Party</span>
                            {parties.length > 0 &&
                                <button className="clear-mini" onClick={() => setParties([])}>Clear</button>}
                        </div>
                        <div className="pill-row">
                            {allParties.length === 0
                                ? <span className="filter-empty">No parties in data</span>
                                : allParties.map(p => (
                                    <button key={p}
                                        className={`party-pill ${parties.includes(p) ? "active" : ""}`}
                                        onClick={() => toggleParty(p)}
                                    >
                                        {parties.includes(p) && <span className="check-icon">✓ </span>}
                                        {p}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>

                {preset === "custom" && (
                    <div className="filter-section" style={{ marginTop: 20 }}>
                        <span className="filter-label">Custom Date &amp; Time</span>
                        <div className="date-range-row">
                            <div className="date-input-wrap">
                                <span className="date-input-label">From</span>
                                <input type="datetime-local" className="date-input"
                                    value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            </div>
                            <span className="date-sep">→</span>
                            <div className="date-input-wrap">
                                <span className="date-input-label">To</span>
                                <input type="datetime-local" className="date-input"
                                    value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="filter-footer">
                    <span className="filter-result-count">
                        Showing <strong>{rows.length}</strong> of <strong>{recent.length}</strong> records
                    </span>
                    {active > 0 &&
                        <button className="clear-all-btn" onClick={clearAll}>✕ Clear all</button>}
                </div>
            </div>

            {/* ── METRIC CARDS ── */}
            <div className="metric-row">
                {[
                    { val: total, label: "Faulty Sessions" },
                    { val: stationMap.length, label: "Stations Impacted" },
                    { val: partyDist.length, label: "Parties Impacted" },
                    { val: avgF, label: "Avg Faults / Station" },
                ].map((m, i) => (
                    <div className="metric-card" key={i}>
                        <h3>{m.val}</h3>
                        <p>{m.label}</p>
                        <span className="watermark">{m.val}</span>
                    </div>
                ))}
            </div>

            {/* ── ROW 1: Trend + Pie ── */}
            <div className="chart-grid">

                <div className="chart-card">
                    <div className="card-header">
                        <h4><span className="card-dot blue" />Fault Trend</h4>
                        <span className="card-count">{trendData.length} day{trendData.length !== 1 ? "s" : ""}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={230}>
                        <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" />
                            <XAxis dataKey="_id"
                                tick={{ fontSize: 11, fill: "#7a93b0", fontFamily: "Arial" }}
                                axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false}
                                tick={{ fontSize: 11, fill: "#7a93b0", fontFamily: "Arial" }}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<Tip />} />
                            <Area type="monotone" dataKey="faults" name="Faults"
                                stroke="#3b82f6" strokeWidth={2.5}
                                fill="url(#areaBlue)"
                                dot={{ fill: "#3b82f6", r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: "#60a5fa", strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <div className="card-header">
                        <h4><span className="card-dot orange" />Party Distribution</h4>
                        <span className="card-count">{partyDist.length} parties</span>
                    </div>
                    {partyDist.length === 0
                        ? <div className="empty-state"><span className="empty-icon">🏢</span>No data</div>
                        : (
                            <ResponsiveContainer width="100%" height={230}>
                                <PieChart>
                                    <Pie data={partyDist} dataKey="faults" nameKey="_id"
                                        cx="50%" cy="46%"
                                        innerRadius={58} outerRadius={88}
                                        paddingAngle={4} stroke="none">
                                        {partyDist.map((_, i) => (
                                            <Cell key={i} fill={C[i % C.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<Tip />} />
                                    <Legend iconType="circle" iconSize={8}
                                        wrapperStyle={{ fontSize: 12, fontFamily: "Arial", color: "#7a93b0", paddingTop: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>

            </div>

            {/* ── ROW 2: Bar + Stations ── */}
            <div className="chart-grid">

                <div className="chart-card">
                    <div className="card-header">
                        <h4><span className="card-dot purple" />Fault Reasons</h4>
                        <span className="card-count">{reasonDist.length} type{reasonDist.length !== 1 ? "s" : ""}</span>
                    </div>
                    {reasonDist.length === 0
                        ? <div className="empty-state"><span className="empty-icon">📋</span>No reasons found</div>
                        : (
                            <ResponsiveContainer width="100%" height={270}>
                                <BarChart
                                    data={reasonDist}
                                    barSize={36}
                                    margin={{ top: 20, right: 16, left: -16, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                                    <XAxis
                                        dataKey="short"
                                        tick={{ fontSize: 11, fill: "#7a93b0", fontFamily: "Arial", fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={0}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: "#7a93b0", fontFamily: "Arial" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<ReasonTip />}
                                        cursor={{ fill: "rgba(255,255,255,.04)" }} />
                                    <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                                        {reasonDist.map((_, i) => (
                                            <Cell key={i} fill={C[i % C.length]} />
                                        ))}
                                        <LabelList
                                            dataKey="count"
                                            position="top"
                                            style={{ fontSize: 12, fill: "#7a93b0", fontFamily: "Arial", fontWeight: 700 }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>

                <div className="chart-card">
                    <div className="card-header">
                        <h4><span className="card-dot green" />Top Faulty Stations</h4>
                        <span className="card-count">{stationMap.length} stations</span>
                    </div>
                    {stationMap.length === 0
                        ? <div className="empty-state"><span className="empty-icon">📍</span>No stations</div>
                        : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Station</th>
                                        <th>City</th>
                                        <th>Faults</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stationMap.map((s, i) => (
                                        <tr key={i}>
                                            <td><span className="rank-num">{i + 1}</span></td>
                                            <td className="station-name">{s.name}</td>
                                            <td className="muted">{s.city}</td>
                                            <td><FaultBadge value={s.faults} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    }
                </div>

            </div>

            {/* ── RECENT SESSIONS ── */}
            <div className="chart-card" style={{ marginTop: 16 }}>
                <div className="card-header">
                    <h4><span className="card-dot blue" />Recent Faulty Sessions</h4>
                    <span className="card-count">{rows.length} records</span>
                </div>
                {rows.length === 0
                    ? (
                        <div className="empty-state">
                            <span className="empty-icon">🔍</span>
                            No records match the selected filters
                        </div>
                    ) : (
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Station</th>
                                        <th>Party</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i}>
                                            <td className="muted nowrap">
                                                {new Date(r.created_at).toLocaleString("en-IN", {
                                                    day: "2-digit", month: "short",
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </td>
                                            <td className="station-name">{r.station_name}</td>
                                            <td><span className="party-tag">{r.partyId}</span></td>
                                            <td><span className="reason-tag">{r.faulty_reasons?.[0]}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>

        </div>
    );
}