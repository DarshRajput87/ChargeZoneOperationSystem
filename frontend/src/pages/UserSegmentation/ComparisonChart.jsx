import { useState, useEffect, useCallback, useRef } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import API from "../../services/api";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const METRICS = [
    {
        key: "total_sessions",
        label: "Total Sessions",
        prefix: "",
        suffix: "",
        color: "#6366f1",
    },
    {
        key: "successful_sessions",
        label: "Successful Sessions",
        prefix: "",
        suffix: "",
        color: "#22c55e",
    },
    {
        key: "total_revenue",
        label: "Revenue",
        prefix: "₹",
        suffix: "",
        color: "#f59e0b",
    },
    {
        key: "total_units",
        label: "Units (kWh)",
        prefix: "",
        suffix: " kWh",
        color: "#06b6d4",
    },
    {
        key: "active_users",
        label: "Active Users",
        prefix: "",
        suffix: "",
        color: "#f97316",
    },
    { key: "arpu", label: "ARPU", prefix: "₹", suffix: "", color: "#a855f7" },
];

const PRESETS = [
    { label: "1W", days: 7 },
    { label: "2W", days: 14 },
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
    { label: "6M", days: 180 },
];

function toLocalISO(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return toLocalISO(d);
}

function subDays(dateStr, n) {
    return addDays(dateStr, -n);
}

function granularityFor(startStr, endStr) {
    const ms = new Date(endStr) - new Date(startStr);
    const days = ms / 86400000;
    if (days > 90) return "week";
    if (days > 365) return "month";
    return "day";
}

function formatVal(val, prefix, suffix) {
    if (val === null || val === undefined) return "—";
    return `${prefix}${Number(val).toLocaleString()}${suffix}`;
}

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, metric }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chrt-tooltip">
            <div className="chrt-tooltip-title">{label}</div>
            {payload.map((p) => (
                <div
                    key={p.dataKey}
                    className="chrt-tooltip-row"
                    style={{ color: p.color }}
                >
                    <span
                        className="chrt-tooltip-dot"
                        style={{ background: p.color }}
                    />
                    <span>
                        {p.name}:{" "}
                        <b>
                            {formatVal(p.value, metric.prefix, metric.suffix)}
                        </b>
                    </span>
                </div>
            ))}
        </div>
    );
}

function formatDuration(start, end) {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    if (ms <= 0) return null;

    // Add 1 hour leeway so 23:00+ maps to a full day
    const days = Math.floor((ms + 3600000) / 86400000);
    
    if (days >= 1) {
        if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? "s" : ""}`;
        if (days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? "s" : ""}`;
        return `${days} day${days > 1 ? "s" : ""}`;
    }

    // Add 1 min leeway
    const hours = Math.floor((ms + 60000) / 3600000);
    if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""}`;

    const mins = Math.floor(ms / 60000);
    return `${mins} min${mins > 1 ? "s" : ""}`;
}

// ─── DATE RANGE PICKER ──────────────────────────────────────────────────────
function DateRangePicker({
    label,
    color,
    start,
    end,
    onStartChange,
    onEndChange,
    presets,
    onPreset,
}) {
    const duration = formatDuration(start, end);
    return (
        <div className="chrt-period-picker">
            <div className="chrt-period-header">
                <div className="chrt-period-label" style={{ color }}>
                    <span
                        className="chrt-period-dot"
                        style={{ background: color }}
                    />
                    {label}
                </div>
                {duration && (
                    <span className="chrt-period-duration">{duration}</span>
                )}
            </div>
            <div className="chrt-presets">
                {presets.map((p) => (
                    <button
                        key={p.label}
                        className="chrt-preset-btn"
                        onClick={() => onPreset(p.days)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="chrt-date-inputs">
                <div className="chrt-date-field">
                    <label>From</label>
                    <input
                        type="datetime-local"
                        value={start}
                        onChange={(e) => onStartChange(e.target.value)}
                    />
                </div>
                <div className="chrt-date-field">
                    <label>To</label>
                    <input
                        type="datetime-local"
                        value={end}
                        onChange={(e) => onEndChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── SUMMARY CARDS ──────────────────────────────────────────────────────────
function SummaryCards({ data, loading }) {
    return (
        <div className="chrt-summary-grid">
            {METRICS.map((metric) => {
                const totalA = data?.summary?.periodA?.[metric.key] ?? 0;
                const totalB = data?.summary?.periodB?.[metric.key] ?? 0;
                const delta =
                    totalB === 0
                        ? totalA > 0
                            ? 100
                            : 0
                        : parseFloat(
                              (((totalA - totalB) / totalB) * 100).toFixed(1),
                          );
                const isFlat = delta === 0;
                const isUp = delta > 0;

                return (
                    <div
                        key={metric.key}
                        className="chrt-summary-card"
                        style={{ "--card-accent": metric.color }}
                    >
                        <div
                            className="chrt-summary-label"
                            style={{ color: metric.color }}
                        >
                            {metric.label}
                        </div>
                        {loading ? (
                            <div className="chrt-summary-skeleton" />
                        ) : (
                            <>
                                <div className="chrt-summary-periods">
                                    <div className="chrt-summary-period">
                                        <span
                                            className="chrt-summary-period-dot"
                                            style={{ background: "#6366f1" }}
                                        />
                                        <span className="chrt-summary-period-name">
                                            A
                                        </span>
                                        <span className="chrt-summary-value">
                                            {metric.prefix}
                                            {Number(totalA).toLocaleString()}
                                            {metric.suffix}
                                        </span>
                                    </div>
                                    <div className="chrt-summary-period">
                                        <span
                                            className="chrt-summary-period-dot"
                                            style={{ background: "#f97316" }}
                                        />
                                        <span className="chrt-summary-period-name">
                                            B
                                        </span>
                                        <span className="chrt-summary-value">
                                            {metric.prefix}
                                            {Number(totalB).toLocaleString()}
                                            {metric.suffix}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={`chrt-summary-delta ${isFlat ? "flat" : isUp ? "up" : "down"}`}
                                >
                                    <span className="chrt-summary-delta-arrow">
                                        {isFlat
                                            ? "\u2192"
                                            : isUp
                                              ? "\u2191"
                                              : "\u2193"}
                                    </span>
                                    {isFlat
                                        ? "No change"
                                        : `${Math.abs(delta)}% vs Period B`}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── METRIC PILL ────────────────────────────────────────────────────────────
function MetricPill({ metric, active, onClick }) {
    return (
        <button
            className={`chrt-metric-pill ${active ? "active" : ""}`}
            style={
                active
                    ? {
                          borderColor: metric.color,
                          background: `${metric.color}18`,
                          color: metric.color,
                      }
                    : {}
            }
            onClick={onClick}
        >
            {metric.label}
        </button>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ComparisonChart({ selectedRoles }) {
    const today = new Date();
    const todayEnd = toLocalISO(today).slice(0, 10) + "T23:59";
    const todayStart = toLocalISO(today).slice(0, 10) + "T00:00";

    const [periodA, setPeriodA] = useState({
        start: subDays(todayStart, 29),
        end: todayEnd,
    });
    const [periodB, setPeriodB] = useState({
        start: subDays(todayStart, 59),
        end: subDays(todayEnd, 30),
    });
    const [activeMetrics, setActiveMetrics] = useState(
        new Set(["total_sessions", "total_revenue"]),
    );
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const abortRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (!periodA.start || !periodA.end || !periodB.start || !periodB.end)
            return;
        if (abortRef.current) abortRef.current.abort();
        const abortCtrl = new AbortController();
        abortRef.current = abortCtrl;
        setLoading(true);
        setError(null);
        try {
            const gran = granularityFor(periodA.start, periodA.end);
            const params = new URLSearchParams({
                startA: periodA.start,
                endA: periodA.end,
                startB: periodB.start,
                endB: periodB.end,
                granularity: gran,
                role: (selectedRoles || []).join(','),
            });
            const res = await API.get(`/compare?${params}`, {
                signal: abortCtrl.signal,
            });
            const jsonData = res.data;
            if (!abortCtrl.signal.aborted) {
                setData(jsonData);
            }
        } catch (e) {
            if (e.name !== "AbortError") setError(e.message);
        } finally {
            if (!abortCtrl.signal.aborted) {
                setLoading(false);
            }
        }
    }, [periodA, periodB, refreshKey, selectedRoles]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleMetric = (key) => {
        setActiveMetrics((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size > 1) next.delete(key);
            } else next.add(key);
            return next;
        });
    };

    // Build chart datasets for each active metric separately
    const buildChartData = (metric) => {
        if (!data) return [];
        const { periodA: pA = [], periodB: pB = [] } = data;
        const maxLen = Math.max(pA.length, pB.length);
        return Array.from({ length: maxLen }, (_, i) => ({
            index: i + 1,
            labelA: pA[i]?.label || `P${i + 1}`,
            labelB: pB[i]?.label || `P${i + 1}`,
            A: pA[i]?.[metric.key] ?? null,
            B: pB[i]?.[metric.key] ?? null,
        }));
    };

    const applyPresetA = (days) => {
        const end = toLocalISO(new Date()).slice(0, 10) + "T23:59";
        const start = subDays(end.slice(0, 10) + "T00:00", days - 1);
        setPeriodA({ start, end });
        
        const endB = subDays(start.slice(0, 10) + "T23:59", 1);
        const startB = subDays(endB.slice(0, 10) + "T00:00", days - 1);
        setPeriodB({ start: startB, end: endB });
    };
    const applyPresetB = (days) => {
        const end = subDays(periodA.start.slice(0, 10) + "T23:59", 1);
        const start = subDays(end.slice(0, 10) + "T00:00", days - 1);
        setPeriodB({ start, end });
    };

    const activeMetricList = METRICS.filter((m) => activeMetrics.has(m.key));

    return (
        <div className="comparison-chart">
            {/* ── Header ── */}
            <div className="chrt-header">
                <div>
                    <h2 className="chrt-title">Advanced Comparison</h2>
                    <p className="chrt-subtitle">
                        Select two periods and metrics to compare performance
                    </p>
                </div>
                <button
                    className="chrt-refresh-btn"
                    onClick={() => setRefreshKey((k) => k + 1)}
                    disabled={loading}
                >
                    <span className={loading ? "spin" : ""}>↻</span>
                    {loading ? "Loading…" : "Refresh"}
                </button>
            </div>

            {/* ── Controls ── */}
            <div className="chrt-controls">
                <DateRangePicker
                    label="Period A"
                    color="#6366f1"
                    start={periodA.start}
                    end={periodA.end}
                    onStartChange={(v) =>
                        setPeriodA((p) => ({ ...p, start: v }))
                    }
                    onEndChange={(v) => setPeriodA((p) => ({ ...p, end: v }))}
                    presets={PRESETS}
                    onPreset={applyPresetA}
                />
                <div className="chrt-vs-divider">VS</div>
                <DateRangePicker
                    label="Period B"
                    color="#f97316"
                    start={periodB.start}
                    end={periodB.end}
                    onStartChange={(v) =>
                        setPeriodB((p) => ({ ...p, start: v }))
                    }
                    onEndChange={(v) => setPeriodB((p) => ({ ...p, end: v }))}
                    presets={PRESETS}
                    onPreset={applyPresetB}
                />
            </div>

            {/* ── Metric pills ── */}
            <div className="chrt-metrics-row">
                {METRICS.map((m) => (
                    <MetricPill
                        key={m.key}
                        metric={m}
                        active={activeMetrics.has(m.key)}
                        onClick={() => toggleMetric(m.key)}
                    />
                ))}
            </div>

            {/* ── Summary Cards ── */}
            {!error && <SummaryCards data={data} loading={loading} />}

            {/* ── Error ── */}
            {error && <div className="chrt-error">⚠ {error}</div>}

            {/* ── Charts ── */}
            {!error && (
                <div className="chrt-charts-grid">
                    {activeMetricList.map((metric) => {
                        const chartData = buildChartData(metric);
                        return (
                            <div key={metric.key} className="chrt-chart-card">
                                <div
                                    className="chrt-chart-label"
                                    style={{ color: metric.color }}
                                >
                                    {metric.label}
                                </div>
                                {loading ? (
                                    <div className="chrt-skeleton-chart">
                                        <div className="chrt-loading-content">
                                            <div className="chrt-spinner"></div>
                                            <span>Fetching latest data...</span>
                                        </div>
                                    </div>
                                ) : chartData.length === 0 ? (
                                    <div className="chrt-empty">
                                        No data for this range
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
                                        <LineChart
                                            data={chartData}
                                            margin={{
                                                top: 8,
                                                right: 16,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.05)"
                                            />
                                            <XAxis
                                                dataKey="index"
                                                tick={{
                                                    fill: "#6b7280",
                                                    fontSize: 11,
                                                }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                tick={{
                                                    fill: "#6b7280",
                                                    fontSize: 11,
                                                }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={48}
                                                tickFormatter={(v) =>
                                                    metric.prefix +
                                                    (v >= 1000
                                                        ? `${(v / 1000).toFixed(1)}k`
                                                        : v)
                                                }
                                            />
                                            <Tooltip
                                                content={
                                                    <CustomTooltip
                                                        metric={metric}
                                                    />
                                                }
                                            />
                                            <Legend
                                                formatter={(value) => (
                                                    <span
                                                        style={{
                                                            color: "#9ca3af",
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {value === "A"
                                                            ? `Period A (${periodA.start.replace('T', ' ')} → ${periodA.end.replace('T', ' ')})`
                                                            : `Period B (${periodB.start.replace('T', ' ')} → ${periodB.end.replace('T', ' ')})`}
                                                    </span>
                                                )}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="A"
                                                name="A"
                                                stroke="#6366f1"
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: "#6366f1" }}
                                                activeDot={{ r: 5 }}
                                                connectNulls
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="B"
                                                name="B"
                                                stroke="#f97316"
                                                strokeWidth={2.5}
                                                strokeDasharray="6 3"
                                                dot={{ r: 3, fill: "#f97316" }}
                                                activeDot={{ r: 5 }}
                                                connectNulls
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
