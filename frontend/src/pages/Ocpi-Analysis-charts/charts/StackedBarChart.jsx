// ─── components/charts/StackedBarChart.jsx ──────────────────────────────────
import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import "./charts.css";
import "./BarChart.css";
import { formatPartners, COLORS } from "../../utils/dataFormatter";

const PAGE_SIZE = 5;

const TooltipBox = React.memo(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
        <div className="chart-tooltip">
            <p className="tt-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                </p>
            ))}
            <p style={{ color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 6, paddingTop: 6 }}>
                Total: <strong>{total.toLocaleString()}</strong>
            </p>
        </div>
    );
});

/** Truncate long names so horizontal labels never overflow */
const truncate = (str, max = 12) =>
    str && str.length > max ? str.slice(0, max) + "…" : str;

/** Custom horizontal tick — stays upright, centred under bar */
const HorizontalTick = ({ x, y, payload }) => (
    <text
        x={x}
        y={y + 10}
        textAnchor="middle"
        fill="#64748b"
        fontSize={10}
        fontFamily="var(--font-mono)"
    >
        {truncate(payload.value)}
    </text>
);

const Paginator = ({ page, total, onPrev, onNext }) => {
    if (total <= 1) return null;
    return (
        <div className="paginator">
            <button className="pag-btn" onClick={onPrev} disabled={page === 0} aria-label="Previous">‹</button>
            <span className="pag-info">{page + 1} / {total}</span>
            <button className="pag-btn" onClick={onNext} disabled={page === total - 1} aria-label="Next">›</button>
        </div>
    );
};

const StackedBarChart = ({ partners = [] }) => {
    const allData = useMemo(() => formatPartners(partners, partners.length || 50), [partners]);
    const [page, setPage] = useState(0);

    const pages = useMemo(() => {
        const p = [];
        for (let i = 0; i < allData.length; i += PAGE_SIZE) p.push(allData.slice(i, i + PAGE_SIZE));
        return p.length ? p : [[]];
    }, [allData]);

    const totalPages = pages.length;
    const currentSlice = pages[page] ?? [];

    return (
        <div className="chart-card">
            {/* Row 1: title */}
            <div className="chart-header-row">
                <span className="chart-card-title">
                    Client-wise Stacked Breakdown · Success + Failure
                    {totalPages > 1 && (
                        <span className="chart-card-subtitle">
                            &nbsp;· showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allData.length)} of {allData.length}
                        </span>
                    )}
                </span>
            </div>
            {/* Row 2: legend + paginator */}
            <div className="chart-controls-row">
                <div className="legend-pills">
                    <span className="pill green">■ Success</span>
                    <span className="pill red">■ Failed</span>
                </div>
                <Paginator
                    page={page} total={totalPages}
                    onPrev={() => setPage(p => Math.max(0, p - 1))}
                    onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                />
            </div>

            {currentSlice.length === 0 ? (
                <div className="empty-state">— No partner data —</div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={currentSlice}
                        margin={{ top: 10, right: 20, left: 0, bottom: 24 }}
                        barSize={36}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="name"
                            /* No angle — purely horizontal custom tick */
                            tick={<HorizontalTick />}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            height={34}
                        />
                        <YAxis
                            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<TooltipBox />} />
                        <Bar dataKey="success" name="Success" stackId="a" fill={COLORS.success} />
                        <Bar dataKey="failed" name="Failed" stackId="a" fill={COLORS.failed} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default React.memo(StackedBarChart);