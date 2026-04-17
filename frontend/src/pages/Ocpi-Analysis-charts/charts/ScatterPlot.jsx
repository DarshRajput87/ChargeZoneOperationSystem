// ─── charts/ScatterPlot.jsx ──────────────────────────────────────────────────
// Party × Module Matrix: Clean scatter plot with:
//   • Dynamic HSL colors per party (hash-based, deterministic)
//   • Deterministic jitter to prevent point overlap at same timestamp
//   • Premium dark-theme styling with hover glow
//   • No backend/API modifications required

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
    ResponsiveContainer, ScatterChart, Scatter,
    XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell
} from "recharts";
import API from "../../../services/api";
import { fmt } from "../../utils/dataFormatter";
import "./ScatterPlot.css";

// ── Deterministic HSL color from party name ──────────────────────────────────
// Hash the string → map to an HSL hue with fixed saturation/lightness
// for great contrast on dark backgrounds.
const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32-bit int
    }
    return Math.abs(hash);
};

const partyToColor = (partyId) => {
    const h = hashString(partyId) % 360;
    // Use high saturation + lightness for vibrant dots on dark bg
    return `hsl(${h}, 78%, 62%)`;
};

// ── 2D jitter per DATA POINT (not per party) ─────────────────────────────────
// Each point gets a unique offset based on (party + module + time + index).
// This produces a natural scatter cloud instead of diagonal lines.
const getPointJitter = (party, module, time, index) => {
    const key = `${party}-${module}-${time}-${index}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    hash = Math.abs(hash);

    // X jitter: ±0.3 (time axis spread)
    const jitterX = ((hash % 1000) / 1000 - 0.5) * 0.6;
    // Y jitter: ±0.35 (module row spread) — use different bits
    const jitterY = (((hash >> 7) % 1000) / 1000 - 0.5) * 0.7;

    return { jitterX, jitterY };
};

const ROLE_FILTERS = ["ALL", "EMSP", "CPO"];

const EmptyState = () => (
    <div className="scatter-empty">
        <span className="scatter-empty-icon">◌</span>
        <p className="scatter-empty-title">No Data Points</p>
        <p className="scatter-empty-sub">Adjust role or party filters</p>
    </div>
);

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const ScatterTooltip = React.memo(({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    return (
        <div className="sct-tooltip">
            <div className="sct-tt-bar" style={{ background: d._color }} />
            <div className="sct-tt-content">
                <div className="sct-tt-top">
                    <span className="sct-tt-party" style={{ color: d._color }}>{d.party_id}</span>
                    <span className="sct-tt-role">{d.role}</span>
                </div>
                <div className="sct-tt-grid">
                    <span className="sct-tt-lbl">Module</span>
                    <span className="sct-tt-val">{d.module}</span>
                    <span className="sct-tt-lbl">Time</span>
                    <span className="sct-tt-val">{d.time}</span>
                    <span className="sct-tt-lbl">Calls</span>
                    <span className="sct-tt-val accent">{fmt(d.value)}</span>
                </div>
            </div>
        </div>
    );
});

const ScatterPlotChart = ({ date }) => {
    const [scatterData, setScatterData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState("ALL");
    const [selectedParty, setSelectedParty] = useState("ALL");

    // ── Fetch (no backend changes) ────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const dateParam = date || new Date().toISOString().split("T")[0];
            const res = await API.get(`/ocpi-analytics/party-time-series?date=${dateParam}&booking_type=ocpi`);
            setScatterData(res.data?.data?.scatterData || []);
        } catch (err) {
            console.error("[ScatterPlot] Fetch error:", err);
            setScatterData([]);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Parties sorted by volume (for legend ordering) ────────────────────────
    const uniqueParties = useMemo(() => {
        const vol = new Map();
        scatterData.forEach(d => {
            if (!d.party_id) return;
            vol.set(d.party_id, (vol.get(d.party_id) || 0) + (d.value || 0));
        });
        return [...vol.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    }, [scatterData]);

    const activeModules = useMemo(() =>
        [...new Set(scatterData.map(d => d.module).filter(Boolean))].sort(),
    [scatterData]);

    // ── Transform + jitter + color injection ──────────────────────────────────
    const filteredData = useMemo(() => {
        let data = scatterData;
        if (selectedRole !== "ALL") data = data.filter(d => d.role === selectedRole);
        if (selectedParty !== "ALL") data = data.filter(d => d.party_id === selectedParty);

        return data.map((d, i) => {
            const hour = parseInt(d.time?.split(":")[0] || "0");
            const modIdx = activeModules.indexOf(d.module);
            if (modIdx < 0) return null;

            // 2D jitter unique to this exact data point
            const { jitterX, jitterY } = getPointJitter(d.party_id, d.module, d.time, i);

            return {
                ...d,
                timeIndex: hour + jitterX,
                moduleIndex: modIdx + jitterY,
                _color: partyToColor(d.party_id)
            };
        }).filter(Boolean);
    }, [scatterData, selectedRole, selectedParty, activeModules]);

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="chart-card glass-chart scatter-chart-card">
                <div className="party-loading">
                    <div className="party-loading-spinner" />
                    <p>Building scatter matrix...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-card glass-chart scatter-chart-card">
            {/* ── Header ── */}
            <div className="scatter-chart-header">
                <div className="header-meta">
                    <span className="chart-card-title">Party × Module Matrix</span>
                    <span className="chart-card-subtitle">Each dot = one party's module usage at an hour</span>
                </div>

                <div className="scatter-controls">
                    <div className="control-group">
                        <span className="control-label">Role</span>
                        <div className="role-pills">
                            {ROLE_FILTERS.map(role => (
                                <button key={role}
                                    className={`role-pill ${selectedRole === role ? "active" : ""}`}
                                    onClick={() => setSelectedRole(role)}
                                >{role}</button>
                            ))}
                        </div>
                    </div>

                    <div className="control-group">
                        <span className="control-label">Party</span>
                        <select className="metric-select"
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(e.target.value)}
                        >
                            <option value="ALL">All Parties</option>
                            {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Party Legend (scrollable, clickable) ── */}
            <div className="sct-legend">
                {uniqueParties.map(p => (
                    <button key={p}
                        className={`sct-chip ${selectedParty === p ? "selected" : ""}`}
                        onClick={() => setSelectedParty(prev => prev === p ? "ALL" : p)}
                    >
                        <span className="sct-chip-dot" style={{ background: partyToColor(p) }} />
                        {p}
                    </button>
                ))}
            </div>

            {/* ── Chart ── */}
            {filteredData.length === 0 ? (
                <EmptyState />
            ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, activeModules.length * 30 + 60)}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 80, bottom: 30 }}>
                        <CartesianGrid
                            strokeDasharray="4 6"
                            stroke="rgba(255,255,255,0.04)"
                            horizontal={true}
                            vertical={true}
                        />
                        <XAxis
                            type="number" dataKey="timeIndex" name="Hour"
                            domain={[-0.5, 23.5]}
                            ticks={Array.from({ length: 8 }, (_, i) => i * 3)}
                            tickFormatter={(v) => `${String(v).padStart(2, "0")}:00`}
                            tick={{ fill: "#525f73", fontSize: 10, fontFamily: "var(--font-mono)" }}
                            tickLine={false} axisLine={false}
                            label={{
                                value: "Hour of Day (IST)", position: "insideBottom",
                                offset: -16, fill: "#3a4557", fontSize: 9, fontFamily: "var(--font-mono)"
                            }}
                        />
                        <YAxis
                            type="number" dataKey="moduleIndex" name="Module"
                            domain={[-0.5, activeModules.length - 0.5]}
                            ticks={activeModules.map((_, i) => i)}
                            tickFormatter={(v) => activeModules[v] || ""}
                            tick={{ fill: "#6b7a8d", fontSize: 10, fontFamily: "var(--font-mono)" }}
                            tickLine={false} axisLine={false} width={75}
                        />
                        {/* Fixed small dot size */}
                        <ZAxis type="number" dataKey="value" range={[35, 35]} name="Calls" />
                        <Tooltip content={<ScatterTooltip />} cursor={false} />
                        <Scatter data={filteredData} animationDuration={400}>
                            {filteredData.map((entry, i) => (
                                <Cell
                                    key={i}
                                    fill={entry._color}
                                    fillOpacity={0.8}
                                    stroke="rgba(0,0,0,0.25)"
                                    strokeWidth={0}
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default React.memo(ScatterPlotChart);
