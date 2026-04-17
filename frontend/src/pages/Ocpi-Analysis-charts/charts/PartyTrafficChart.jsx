// ─── charts/PartyTrafficChart.jsx ────────────────────────────────────────────
// Line chart: Top N parties over hourly time buckets.
// Uses dataFormatter utilities for consistency with the rest of the dashboard.

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
    ResponsiveContainer, AreaChart, Area, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import API from "../../../services/api";
import { CHART_PALETTE, fmt } from "../../utils/dataFormatter";
import "./PartyTrafficChart.css";

// ── Premium color palette (20 distinct, accessible) ──────────────────────────
const PARTY_COLORS = [
    "#00E5FF", "#00FF9C", "#A78BFA", "#FB923C", "#60A5FA",
    "#F472B6", "#FACC15", "#10B981", "#818CF8", "#F43F5E",
    "#14B8A6", "#8B5CF6", "#6366F1", "#D97706", "#EF4444",
    "#22D3EE", "#E879F9", "#84CC16", "#F59E0B", "#3B82F6"
];

const METRIC_OPTIONS = [
    { key: "total", label: "Total", icon: "📊" },
    { key: "locations", label: "Locations", icon: "📍" },
    { key: "sessions", label: "Sessions", icon: "⚡" },
    { key: "commands", label: "Commands", icon: "🔧" },
    { key: "cdrs", label: "CDRs", icon: "🧾" },
    { key: "tokens", label: "Tokens", icon: "🔑" },
    { key: "tariffs", label: "Tariffs", icon: "💰" },
];

const ROLE_FILTERS = ["ALL", "EMSP", "CPO"];
const TOP_N_OPTIONS = [5, 10, 15, 20];

const EmptyState = () => (
    <div className="empty-state-v2">
        <span className="empty-icon">🔗</span>
        <p className="empty-title">No Party Traffic Data</p>
        <p className="empty-sub">Select a different date or wait for data to load</p>
    </div>
);

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const PartyTooltip = React.memo(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    // Sort by value descending, take top 10 for tooltip
    const sorted = [...payload]
        .filter(p => (p.value || 0) > 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 10);

    if (sorted.length === 0) return null;

    const totalVal = sorted.reduce((s, p) => s + (p.value || 0), 0);

    return (
        <div className="party-tooltip">
            <div className="party-tt-header">
                <span className="party-tt-time">{label}</span>
                <span className="party-tt-total">{fmt(totalVal)} calls</span>
            </div>
            <div className="party-tt-list">
                {sorted.map((p, i) => {
                    const pctVal = totalVal > 0 ? ((p.value / totalVal) * 100).toFixed(1) : 0;
                    return (
                        <div key={i} className="party-tt-row">
                            <span className="party-tt-rank">#{i + 1}</span>
                            <span className="party-tt-dot" style={{ background: p.color }} />
                            <span className="party-tt-name">{p.name}</span>
                            <div className="party-tt-vals">
                                <strong className="party-tt-val">{fmt(p.value || 0)}</strong>
                                <span className="party-tt-pct">{pctVal}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {payload.length > 10 && (
                <div className="party-tt-footer">+{payload.length - 10} more parties</div>
            )}
        </div>
    );
});

const PartyTrafficChart = ({ date }) => {
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState("ALL");
    const [selectedMetric, setSelectedMetric] = useState("total");
    const [topN, setTopN] = useState(10);
    const [hiddenParties, setHiddenParties] = useState(new Set());

    // ── Fetch party-time-series independently ─────────────────────────────────
    const fetchPartyData = useCallback(async () => {
        try {
            setLoading(true);
            const dateParam = date || new Date().toISOString().split("T")[0];
            const res = await API.get(`/ocpi-analytics/party-time-series?date=${dateParam}&booking_type=ocpi`);
            setRawData(res.data?.data || null);
        } catch (err) {
            console.error("[PartyTrafficChart] Fetch error:", err);
            setRawData(null);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchPartyData(); }, [fetchPartyData]);

    // ── Filter by role ────────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!rawData?.timeSeries?.length) return [];
        if (selectedRole === "ALL") return rawData.timeSeries;
        return rawData.timeSeries.filter(d => d.role === selectedRole);
    }, [rawData, selectedRole]);

    // ── Rank parties by total volume and take Top N ───────────────────────────
    const { rankedParties, colorMap } = useMemo(() => {
        const volumeMap = new Map();
        filteredData.forEach(d => {
            if (!d.party_id || d.party_id === "UNKNOWN") return;
            const val = d[selectedMetric] || 0;
            const existing = volumeMap.get(d.party_id) || {
                party_id: d.party_id,
                partner_name: d.partner_name || d.party_id,
                role: d.role,
                totalVolume: 0
            };
            existing.totalVolume += val;
            volumeMap.set(d.party_id, existing);
        });

        const sorted = Array.from(volumeMap.values())
            .sort((a, b) => b.totalVolume - a.totalVolume)
            .slice(0, topN);

        const cMap = {};
        sorted.forEach((p, i) => {
            cMap[p.party_id] = PARTY_COLORS[i % PARTY_COLORS.length];
        });

        return { rankedParties: sorted, colorMap: cMap };
    }, [filteredData, selectedMetric, topN]);

    // ── Transform into Recharts format ────────────────────────────────────────
    const chartData = useMemo(() => {
        if (!filteredData.length || !rankedParties.length) return [];

        const partyIds = new Set(rankedParties.map(p => p.party_id));
        const hourMap = new Map();

        filteredData.forEach(item => {
            if (!partyIds.has(item.party_id)) return;
            if (!hourMap.has(item.time)) {
                hourMap.set(item.time, { time: item.time });
            }
            const row = hourMap.get(item.time);
            const val = item[selectedMetric] || 0;
            row[item.party_id] = (row[item.party_id] || 0) + val;
        });

        return Array.from(hourMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [filteredData, selectedMetric, rankedParties]);

    // ── Visible parties ───────────────────────────────────────────────────────
    const visibleParties = useMemo(() =>
        rankedParties.filter(p => !hiddenParties.has(p.party_id)),
        [rankedParties, hiddenParties]
    );

    const toggleParty = (partyId) => {
        setHiddenParties(prev => {
            const next = new Set(prev);
            next.has(partyId) ? next.delete(partyId) : next.add(partyId);
            return next;
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="chart-card glass-chart party-chart-card">
                <div className="party-loading">
                    <div className="party-loading-spinner" />
                    <p>Fetching party analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-card glass-chart party-chart-card">
            {/* ── Header Controls ── */}
            <div className="party-chart-header">
                <div className="header-meta">
                    <span className="chart-card-title">Party Traffic · Hourly</span>
                    <span className="chart-card-subtitle">
                        Top {topN} Partners · {METRIC_OPTIONS.find(m => m.key === selectedMetric)?.label} · {selectedRole === "ALL" ? "All Roles" : selectedRole}
                    </span>
                </div>

                <div className="party-controls">
                    {/* Role pills */}
                    <div className="control-group">
                        <span className="control-label">Role</span>
                        <div className="role-pills">
                            {ROLE_FILTERS.map(role => (
                                <button
                                    key={role}
                                    className={`role-pill ${selectedRole === role ? "active" : ""}`}
                                    onClick={() => setSelectedRole(role)}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Top N selector */}
                    <div className="control-group">
                        <span className="control-label">Show</span>
                        <div className="role-pills">
                            {TOP_N_OPTIONS.map(n => (
                                <button
                                    key={n}
                                    className={`role-pill compact ${topN === n ? "active" : ""}`}
                                    onClick={() => { setTopN(n); setHiddenParties(new Set()); }}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metric selector */}
                    <div className="control-group">
                        <span className="control-label">Metric</span>
                        <select
                            className="metric-select"
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            {METRIC_OPTIONS.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.icon} {opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Ranked Party Legend ── */}
            {rankedParties.length > 0 && (
                <div className="party-legend-strip">
                    {rankedParties.map((p, i) => (
                        <button
                            key={p.party_id}
                            className={`party-pill ${hiddenParties.has(p.party_id) ? "dimmed" : "active"}`}
                            onClick={() => toggleParty(p.party_id)}
                            style={{ "--party-color": colorMap[p.party_id] }}
                            title={`${p.partner_name} · ${fmt(p.totalVolume)} calls`}
                        >
                            <span className="party-pill-rank">#{i + 1}</span>
                            <span className="party-pill-dot" />
                            <span className="party-pill-id">{p.party_id}</span>
                            <span className="party-pill-vol">{fmt(p.totalVolume)}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Chart ── */}
            {chartData.length === 0 ? (
                <EmptyState />
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                            {visibleParties.map(p => (
                                <linearGradient key={`grad-${p.party_id}`} id={`grad-${p.party_id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colorMap[p.party_id]} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={colorMap[p.party_id]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                            tickLine={false} axisLine={false}
                            interval="preserveStartEnd" minTickGap={40}
                        />
                        <YAxis
                            tick={{ fill: "#64748b", fontSize: 10 }}
                            tickLine={false} axisLine={false} width={50}
                            tickFormatter={fmt}
                        />
                        <Tooltip content={<PartyTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />

                        {/* Top party gets area fill, rest get lines */}
                        {visibleParties.map((p, i) => (
                            i === 0 ? (
                                <Area
                                    key={p.party_id}
                                    type="monotone"
                                    dataKey={p.party_id}
                                    stroke={colorMap[p.party_id]}
                                    strokeWidth={2.5}
                                    fill={`url(#grad-${p.party_id})`}
                                    fillOpacity={1}
                                    name={p.partner_name || p.party_id}
                                    connectNulls
                                    animationDuration={800}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            ) : (
                                <Line
                                    key={p.party_id}
                                    type="monotone"
                                    dataKey={p.party_id}
                                    stroke={colorMap[p.party_id]}
                                    strokeWidth={i < 3 ? 2 : 1.5}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: colorMap[p.party_id] }}
                                    name={p.partner_name || p.party_id}
                                    connectNulls
                                    animationDuration={600 + i * 50}
                                    strokeOpacity={i < 5 ? 1 : 0.7}
                                />
                            )
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default React.memo(PartyTrafficChart);
