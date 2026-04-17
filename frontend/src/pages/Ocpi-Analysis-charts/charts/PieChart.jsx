// ─── components/charts/PieChart.jsx ─────────────────────────────────────────
// Interactive donut pie: toggles between Status split and Module distribution.
// Props:
//   summary (raw /summary API object)
//   modules (raw /modules API array)

import React, { useState, useMemo, useCallback } from "react";
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Sector, Tooltip } from "recharts";
import "./charts.css";
import "./PieChart.css";
import {
    formatPieStatus,
    formatPieModules,
} from "../../utils/dataFormatter";

const TooltipBox = React.memo(({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
        <div className="chart-tooltip">
            <p className="tt-label">{p.name}</p>
            <p style={{ color: p.payload?.color }}>
                Count: <strong>{p.value?.toLocaleString()}</strong>
            </p>
        </div>
    );
});

const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;
    return (
        <g>
            <text x={cx} y={cy - 14} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight={600}
                fontFamily="var(--font-display)">
                {payload.name}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill={fill} fontSize={22} fontWeight={700}
                fontFamily="var(--font-display)">
                {value.toLocaleString()}
            </text>
            <text x={cx} y={cy + 32} textAnchor="middle" fill="#64748b" fontSize={12}
                fontFamily="var(--font-mono)">
                {(percent * 100).toFixed(1)}%
            </text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
                startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5} />
        </g>
    );
};

const PieChartComponent = ({ summary = null, modules = [] }) => {
    const [activeType, setActiveType] = useState("status");
    const [activeIndex, setActiveIndex] = useState(0);

    // Optimization: Memoize the data based on active type
    const pieData = useMemo(() => {
        return activeType === "status"
            ? formatPieStatus(summary)
            : formatPieModules(modules);
    }, [activeType, summary, modules]);

    const onMouseEnter = useCallback((_, i) => setActiveIndex(i), []);

    return (
        <div className="chart-card">
            <div className="chart-card-header">
                <span className="chart-card-title">
                    {activeType === "status" ? "Success vs Failure" : "Module Distribution"}
                </span>
                <div className="toggle-group">
                    <button
                        className={`toggle-btn ${activeType === "status" ? "active" : ""}`}
                        onClick={() => { setActiveType("status"); setActiveIndex(0); }}
                    >
                        Status
                    </button>
                    <button
                        className={`toggle-btn ${activeType === "module" ? "active" : ""}`}
                        onClick={() => { setActiveType("module"); setActiveIndex(0); }}
                    >
                        Module
                    </button>
                </div>
            </div>

            {pieData.every(d => d.value === 0) ? (
                <div className="empty-state">— No data —</div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={260}>
                        <RePieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={72}
                                outerRadius={100}
                                dataKey="value"
                                onMouseEnter={onMouseEnter}
                            >
                                {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip content={<TooltipBox />} />
                        </RePieChart>
                    </ResponsiveContainer>

                    {/* Compact legend */}
                    <div className="pie-legend">
                        {pieData.map((entry, i) => (
                            <div
                                key={i}
                                className={`pie-legend-item ${i === activeIndex ? "active" : ""}`}
                                onMouseEnter={() => setActiveIndex(i)}
                            >
                                <span className="pie-dot" style={{ background: entry.color }} />
                                <span className="pie-legend-name">{entry.name}</span>
                                <span className="pie-legend-val" style={{ color: entry.color }}>
                                    {entry.value.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default React.memo(PieChartComponent);