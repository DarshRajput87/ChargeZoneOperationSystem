import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer, AreaChart, Area, Line,
    XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import "./charts.css";

// ── Strict Color Consistency (Senior Engine Spec) ───────────────────────────
const COLORS_MAP = {
    total: "#00E5FF",
    success: "#00FF9C",
    failed: "#FF4D6D",
    cdrs: "#A78BFA",
    commands: "#FACC15",
    locations: "#FB923C",
    sessions: "#60A5FA",
    tokens: "#F472B6",
    // Fallbacks for extra modules
    "cdrs-emsp": "#818CF8",
    "commands-emsp": "#D97706",
    tariffs: "#10B981",
    credentials: "#6366F1",
    endpoints: "#14B8A6",
    versions: "#F43F5E",
    hubs: "#8B5CF6",
    unknown: "#94a3b8"
};

const VALID_KEYS = ["total", "success", "failed", "cdrs", "commands", "locations", "sessions", "tokens"];

const EmptyState = () => (
    <div className="empty-state-v2">
        <span className="empty-icon">📊</span>
        <p className="empty-title">No Activity Detected</p>
        <p className="empty-sub">Try selecting a different date or module filter</p>
    </div>
);

const TooltipBox = React.memo(({ active, payload, label, activeSeries }) => {
    if (!active || !payload?.length) return null;

    // Filter payload based on active selection (Strict Rule 8)
    const filteredPayload = payload.filter(p => activeSeries.includes(p.dataKey));
    if (filteredPayload.length === 0) return null;

    const totalVal = payload.find(p => p.dataKey === "total")?.value || 0;

    return (
        <div className="chart-tooltip v2">
            <p className="tt-label">{label}</p>
            <div className="tt-grid-custom">
                {filteredPayload.map((p, i) => {
                    const isAggregate = ["total", "success", "failed"].includes(p.dataKey);
                    const percentage = totalVal > 0 && !isAggregate 
                        ? ((p.value / totalVal) * 100).toFixed(1) + "%" 
                        : null;

                    return (
                        <div key={i} className={`tt-row ${isAggregate ? "is-agg" : ""}`}>
                            <div className="tt-left">
                                <span className="tt-dot" style={{ backgroundColor: p.color }} />
                                <span className="tt-name">{p.name}</span>
                            </div>
                            <div className="tt-right">
                                <strong className="tt-val">{p.value?.toLocaleString()}</strong>
                                {percentage && <span className="tt-pct">{percentage}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const LineChartComponent = ({ timeSeries = [] }) => {
    // 1. SAFE FRONTEND FALLBACK (Strict Rule 3)
    const safeData = useMemo(() => {
        if (!timeSeries?.length) return [];
        return timeSeries.map(d => ({
            time: d.time || "00:00",
            total: Number(d.total) || 0,
            success: Number(d.success) || 0,
            failed: Number(d.failed) || 0,
            cdrs: Number(d.cdrs) || 0,
            commands: Number(d.commands) || 0,
            locations: Number(d.locations) || 0,
            sessions: Number(d.sessions) || 0,
            tokens: Number(d.tokens) || 0,
            // Dynamically include other modules if they exist
            ...Object.keys(d).reduce((acc, key) => {
                if (!VALID_KEYS.includes(key) && key !== "time") {
                    acc[key] = Number(d[key]) || 0;
                }
                return acc;
            }, {})
        }));
    }, [timeSeries]);

    // 2. Identify available module keys for toggling
    const allModuleKeys = useMemo(() => {
        if (!safeData.length) return [];
        const keys = new Set();
        safeData.forEach(item => {
            Object.keys(item).forEach(key => {
                if (!["time", "total", "success", "failed"].includes(key)) {
                    keys.add(key);
                }
            });
        });
        return Array.from(keys).sort();
    }, [safeData]);

    const [activeSeries, setActiveSeries] = useState(["total", "success", "failed", ...allModuleKeys.slice(0, 5)]);

    const toggleSeries = (key) => {
        setActiveSeries(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    // FIX EMPTY CHART BUG (Strict Rule 5)
    if (!safeData.length) {
        return (
            <div className="chart-card glass-chart">
                <EmptyState />
            </div>
        );
    }

    return (
        <div className="chart-card glass-chart">
            <div className="chart-card-header">
                <div className="header-meta">
                    <span className="chart-card-title">Hourly Traffic Pulse</span>
                    <span className="chart-card-subtitle">Layered Protocol Distribution</span>
                </div>
                
                <div className="legend-pills-v2">
                    <div className="pill-group primary">
                        {["total", "success", "failed"].map(key => (
                            <button
                                key={key}
                                className={`pill-btn-v2 ${activeSeries.includes(key) ? "active" : ""}`}
                                onClick={() => toggleSeries(key)}
                                style={{ "--pill-color": COLORS_MAP[key] }}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                    <div className="pill-group modules">
                        {allModuleKeys.map(mod => (
                            <button
                                key={mod}
                                className={`pill-btn-v2 mod ${activeSeries.includes(mod) ? "active" : ""}`}
                                onClick={() => toggleSeries(mod)}
                                style={{ "--pill-color": COLORS_MAP[mod] || "#94a3b8" }}
                            >
                                {mod}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={safeData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                    />
                    <Tooltip content={<TooltipBox activeSeries={activeSeries} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                    
                    {/* BACKGROUND LAYER: Total Volume */}
                    {activeSeries.includes("total") && (
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#00E5FF"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            name="Total"
                            animationDuration={1000}
                            connectNulls
                        />
                    )}

                    {/* SECONDARY LAYER: Success/Failed */}
                    {activeSeries.includes("success") && (
                        <Line
                            type="monotone"
                            dataKey="success"
                            stroke={COLORS_MAP.success}
                            strokeWidth={2}
                            dot={false}
                            name="Success"
                            animationDuration={800}
                            connectNulls
                        />
                    )}
                    {activeSeries.includes("failed") && (
                        <Line
                            type="monotone"
                            dataKey="failed"
                            stroke={COLORS_MAP.failed}
                            strokeWidth={2}
                            dot={false}
                            name="Failed"
                            animationDuration={800}
                            connectNulls
                        />
                    )}

                    {/* TOP LAYER: Interactive Module Detail */}
                    {allModuleKeys.map(mod => (
                        activeSeries.includes(mod) && (
                            <Line
                                key={mod}
                                type="monotone"
                                dataKey={mod}
                                stroke={COLORS_MAP[mod] || "#94a3b8"}
                                strokeWidth={3}
                                dot={{ r: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                name={mod}
                                connectNulls
                                animationDuration={1000}
                            />
                        )
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default React.memo(LineChartComponent);