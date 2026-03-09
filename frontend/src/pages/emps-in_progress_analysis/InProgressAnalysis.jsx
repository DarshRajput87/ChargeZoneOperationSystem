import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./InProgressAnalysis.css";

const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = `${API_URL}/api/emsp-in-progress-analysis`;
const SPARK_DATA = [1, 2, 1, 3, 2, 3, 4, 3, 5, 3, 4, 3];

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ breached, warning }) {
    if (breached > 0) return <span className="status-badge breach"><span className="dot" />Breached</span>;
    if (warning > 0) return <span className="status-badge warning"><span className="dot" />Warning</span>;
    return <span className="status-badge ok"><span className="dot" />On Track</span>;
}

function Ring({ value, max, color }) {
    const r = 22, cx = 28, cy = 28;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / Math.max(max, 1), 1);
    return (
        <svg width={56} height={56}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a3347" strokeWidth={5} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
                strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 1s ease" }} />
            <text x={cx} y={cy + 5} textAnchor="middle" fill="#c9d1d9"
                fontSize={12} fontWeight="600" fontFamily="Inter, sans-serif">{value}</text>
        </svg>
    );
}

function DonutChart({ breached, warning, active }) {
    const ok = Math.max(active - breached - warning, 0);
    const r = 48, cx = 64, cy = 64;
    const circ = 2 * Math.PI * r;
    const segments = [
        { val: breached, color: "#f85149", label: "Breached" },
        { val: warning, color: "#e3b341", label: "Warning" },
        { val: ok, color: "#3fb950", label: "On Track" },
    ];
    let offset = 0;
    const arcs = segments.map(seg => {
        const dash = active > 0 ? (seg.val / active) * circ : 0;
        const arc = { ...seg, dash, gap: circ - dash, offset };
        offset += dash;
        return arc;
    });
    return (
        <div className="donut-wrap">
            <svg width={128} height={128} viewBox="0 0 128 128">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a3347" strokeWidth={12} />
                {arcs.map((a, i) => a.dash > 0 && (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={a.color} strokeWidth={12}
                        strokeDasharray={`${a.dash} ${a.gap}`}
                        strokeDashoffset={-a.offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        style={{ transition: "all 1s ease" }} />
                ))}
                <text x={cx} y={cx - 3} textAnchor="middle" className="donut-center-label">{active}</text>
                <text x={cx} y={cx + 13} textAnchor="middle" className="donut-center-sub">sessions</text>
            </svg>
            <div className="donut-legend">
                {segments.map(s => (
                    <div key={s.label} className="donut-legend-item">
                        <div className="donut-legend-left">
                            <div className="donut-legend-dot" style={{ background: s.color }} />
                            {s.label}
                        </div>
                        <div className="donut-legend-val" style={{ color: s.color }}>{s.val}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HBarChart({ stations }) {
    const max = Math.max(...stations.map(s => s.longestSession), 1);
    const color = v => v > 100 ? "#f85149" : v > 24 ? "#e3b341" : "#3fb950";
    return (
        <div className="bar-chart-wrap">
            {stations.map((s, i) => (
                <div className="bar-chart-item" key={i}>
                    <div className="bar-chart-top">
                        <span className="bar-chart-name">{s.stationName.replace(/Station/gi, "").trim()}</span>
                        <span className="bar-chart-val" style={{ color: color(s.longestSession) }}>{s.longestSession.toFixed(1)}h</span>
                    </div>
                    <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(s.longestSession / max) * 100}%`, background: color(s.longestSession) }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function SparkLine({ data }) {
    const w = 260, h = 70;
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / max) * (h - 10) - 5;
        return `${x},${y}`;
    });
    const polyline = pts.join(" ");
    const area = `0,${h} ${polyline} ${w},${h}`;
    return (
        <div className="spark-wrap">
            <div className="spark-header">
                <span>Session Activity (12h)</span>
                <span style={{ color: "#58a6ff", fontWeight: 600 }}>Peak: {Math.max(...data)}</span>
            </div>
            <svg className="spark-svg" height={h + 8} viewBox={`0 0 ${w} ${h + 8}`} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon points={area} fill="url(#sg)" />
                <polyline points={polyline} fill="none" stroke="#58a6ff" strokeWidth="1.5"
                    strokeLinejoin="round" strokeLinecap="round" />
                {data.map((v, i) => {
                    const x = (i / (data.length - 1)) * w;
                    const y = h - (v / max) * (h - 10) - 5;
                    return <circle key={i} cx={x} cy={y} r={2.5} fill="#58a6ff" />;
                })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#484f58", marginTop: 4 }}>
                <span>12h ago</span><span>Now</span>
            </div>
        </div>
    );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function InProgressAnalysis() {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ts, setTs] = useState(new Date());

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(BASE_URL);
            if (res.data?.success) {
                setAnalysis(res.data.data);
                setTs(new Date());
            } else {
                setError("API returned an unsuccessful response.");
            }
        } catch (err) {
            console.error("EMSP fetch error:", err);
            setError("Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 30_000);
        return () => clearInterval(id);
    }, [fetchData]);

    if (loading && !analysis) {
        return (
            <div className="analysis-page">
                <div className="state-center">
                    <div className="spinner" />
                    <span>Loading…</span>
                </div>
            </div>
        );
    }

    if (error && !analysis) {
        return (
            <div className="analysis-page">
                <div className="state-center error">
                    <span>{error}</span>
                    <button className="retry-btn" onClick={fetchData}>Retry</button>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    const { totals, stationAnalysis, partyAnalysis, sessions = [] } = analysis;
    const maxSession = Math.max(...stationAnalysis.map(s => s.longestSession), 1);
    const maxParty = Math.max(...partyAnalysis.map(p => p.activeSessions), 1);
    const onTrack = totals.totalActive - totals.totalBreached - totals.totalWarning;
    const breachRate = totals.totalActive ? Math.round((totals.totalBreached / totals.totalActive) * 100) : 0;

    return (
        <div className="analysis-page">

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <div className="page-title-icon">⚡</div>
                        EMSP In-Progress Analysis
                    </h1>
                    <p className="page-subtitle">
                        <span className="live-dot" />
                        {ts.toLocaleTimeString()} &middot; {loading ? "Refreshing…" : "Live"}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {error && <span style={{ fontSize: 11, color: "#f85149" }}>{error}</span>}
                    <button className="refresh-pill" onClick={fetchData}>
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            </div>

            {/* Alert */}
            {totals.totalBreached > 0 && (
                <div className="alert-banner">
                    <strong>{totals.totalBreached} session{totals.totalBreached > 1 ? "s" : ""} breached SLA.</strong>
                    &nbsp;Immediate review recommended.
                    <span className="alert-right">
                        {stationAnalysis.filter(s => s.slaBreached > 0).map(s => s.city).join(", ")}
                    </span>
                </div>
            )}

            {/* KPIs */}
            <div className="kpi-row">
                {[
                    { cls: "accent", label: "Total Active", val: totals.totalActive, sub: "sessions running" },
                    { cls: "breach", label: "SLA Breached", val: totals.totalBreached, sub: "need attention" },
                    { cls: "warning", label: "SLA Warning", val: totals.totalWarning, sub: "approaching limit" },
                    { cls: "danger", label: "Breach Rate", val: `${breachRate}%`, sub: "of active sessions" },
                ].map(({ cls, label, val, sub }) => (
                    <div key={label} className={`kpi-card ${cls}`}>
                        <div className="kpi-accent-bar" />
                        <div className="kpi-label">{label}</div>
                        <div className="kpi-value">{val}</div>
                        <div className="kpi-sub">{sub}</div>
                    </div>
                ))}
            </div>

            {/* Station + Party */}
            <div className="main-grid">

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Station Analysis</div>
                        <span className="panel-badge info">{stationAnalysis.length} stations</span>
                    </div>
                    <table className="station-table">
                        <thead>
                            <tr>
                                {["Station", "City", "Active", "Status", "Longest"].map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {stationAnalysis.map((s, i) => {
                                const dur = s.longestSession;
                                const dc = dur > 100 ? "#f85149" : dur > 24 ? "#e3b341" : "#3fb950";
                                const max = Math.max(...stationAnalysis.map(x => x.activeSessions), 1);
                                return (
                                    <tr key={i}>
                                        <td><div className="station-name">{s.stationName}</div></td>
                                        <td><span className="station-city">{s.city}</span></td>
                                        <td>
                                            <div className="ring-wrap">
                                                <Ring value={s.activeSessions} max={max}
                                                    color={s.slaBreached ? "#f85149" : s.slaWarning ? "#e3b341" : "#58a6ff"} />
                                            </div>
                                        </td>
                                        <td><StatusBadge breached={s.slaBreached} warning={s.slaWarning} /></td>
                                        <td>
                                            <div className="session-dur" style={{ color: dc }}>{dur.toFixed(1)}h</div>
                                            <div className="session-bar">
                                                <div className="session-bar-fill" style={{ width: `${(dur / maxSession) * 100}%`, background: dc }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Party Analysis</div>
                        <span className="panel-badge info">{partyAnalysis.length} parties</span>
                    </div>
                    <div className="party-list">
                        {partyAnalysis.map((p, i) => (
                            <div key={i} className="party-row">
                                <div className="party-avatar">{p.partyId}</div>
                                <div className="party-info">
                                    <div className="party-top">
                                        <div className="party-name">{p.partyId}</div>
                                        <StatusBadge breached={p.slaBreached} warning={p.slaWarning} />
                                    </div>
                                    <div className="party-stats">
                                        {[
                                            { label: "Active", val: p.activeSessions, cls: "accent", max: maxParty, bg: "#58a6ff" },
                                            { label: "Breached", val: p.slaBreached, cls: "breach", max: 3, bg: "#f85149" },
                                            { label: "Warning", val: p.slaWarning, cls: "warning", max: 3, bg: "#e3b341" },
                                        ].map(({ label, val, cls, max, bg }) => (
                                            <div key={label} className="party-stat">
                                                <div className="party-stat-label">{label}</div>
                                                <div className={`party-stat-val ${cls}`}>{val}</div>
                                                <div className="party-mini-bar">
                                                    <div className="party-mini-bar-fill" style={{ width: `${(val / max) * 100}%`, background: bg }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="party-footer">
                        {[
                            { label: "Parties", val: partyAnalysis.length, color: "#58a6ff" },
                            { label: "Breaches", val: partyAnalysis.reduce((a, p) => a + p.slaBreached, 0), color: "#f85149" },
                            { label: "Warnings", val: partyAnalysis.reduce((a, p) => a + p.slaWarning, 0), color: "#e3b341" },
                        ].map(({ label, val, color }) => (
                            <div key={label} className="party-footer-stat">
                                <div className="party-footer-label">{label}</div>
                                <div className="party-footer-val" style={{ color }}>{val}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Charts */}
            <div className="charts-row">

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Session Status</div>
                    </div>
                    <DonutChart breached={totals.totalBreached} warning={totals.totalWarning} active={totals.totalActive} />
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Longest Sessions</div>
                        <span className="panel-badge info">by station</span>
                    </div>
                    <HBarChart stations={stationAnalysis} />
                </div>

                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Activity Trend</div>
                    </div>
                    <SparkLine data={SPARK_DATA} />
                </div>

            </div>

            {/* Sessions Table */}
            {sessions.length > 0 && (
                <div className="panel sessions-panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
                            Active Sessions
                        </div>
                        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#484f58" }}>
                            <span style={{ color: "#f85149" }}>{totals.totalBreached} breach</span>
                            <span style={{ color: "#e3b341" }}>{totals.totalWarning} warning</span>
                            <span style={{ color: "#3fb950" }}>{onTrack} on track</span>
                            <span style={{ color: "#8b949e" }}>{totals.totalActive} total</span>
                        </div>
                    </div>
                    <table className="sessions-table">
                        <thead>
                            <tr>
                                {["Booking ID", "Status", "Party", "SLA Duration", "Settle", "Details"].map(h => <th key={h}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s, i) => (
                                <tr key={s.bookingId ?? i}>
                                    <td><span className="booking-id">{s.bookingId}</span></td>
                                    <td>
                                        <span className="status-badge ok" style={{ background: "rgba(88,166,255,0.1)", color: "#58a6ff" }}>
                                            <span className="dot" style={{ background: "#58a6ff" }} />{s.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ background: "rgba(42,51,71,0.8)", color: "#8b949e", padding: "3px 10px", borderRadius: 5, fontWeight: 600, fontSize: 11 }}>
                                            {s.party}
                                        </span>
                                    </td>
                                    <td><span className={`sla-dur ${s.slaClass}`}>{s.slaDuration}</span></td>
                                    <td>
                                        <button className={`settle-btn ${s.canSettle ? "active" : "disabled"}`} disabled={!s.canSettle}>
                                            Settle
                                        </button>
                                    </td>
                                    <td><button className="view-btn">View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
}