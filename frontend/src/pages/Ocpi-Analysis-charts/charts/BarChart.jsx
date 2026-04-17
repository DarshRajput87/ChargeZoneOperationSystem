// ─── components/charts/BarChart.jsx ──────────────────────────────────────────
import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer, BarChart as ReBarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import "./charts.css";
import "./BarChart.css";
import { formatPartners, formatModules, COLORS } from "../../utils/dataFormatter";

const PAGE_SIZE = 5;

const TooltipBox = React.memo(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <span className="tt-label">{label}</span>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                </p>
            ))}
        </div>
    );
});

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

const BarChartComponent = ({ partners = [], modules = [] }) => {
    const allPartnerData = useMemo(() => formatPartners(partners, partners.length || 50), [partners]);
    const moduleData = useMemo(() => formatModules(modules), [modules]);
    const [partnerPage, setPartnerPage] = useState(0);
    const [modulePage, setModulePage] = useState(0);

    const partnerPages = useMemo(() => {
        const p = [];
        for (let i = 0; i < allPartnerData.length; i += PAGE_SIZE) p.push(allPartnerData.slice(i, i + PAGE_SIZE));
        return p.length ? p : [[]];
    }, [allPartnerData]);

    const modulePages = useMemo(() => {
        const p = [];
        for (let i = 0; i < moduleData.length; i += PAGE_SIZE) p.push(moduleData.slice(i, i + PAGE_SIZE));
        return p.length ? p : [[]];
    }, [moduleData]);

    const totalPartnerPages = partnerPages.length;
    const currentPartnerSlice = partnerPages[partnerPage] ?? [];
    const totalModulePages = modulePages.length;
    const currentModuleSlice = modulePages[modulePage] ?? [];

    return (
        <div className="bar-chart-grid">

            {/* ── Client Success Rate ── */}
            <div className="chart-card">
                <div className="chart-header-row">
                    <span className="chart-card-title">Client Success Rate</span>
                    {totalPartnerPages > 1 && (
                        <span className="chart-card-subtitle">
                            {partnerPage * PAGE_SIZE + 1}–{Math.min((partnerPage + 1) * PAGE_SIZE, allPartnerData.length)} of {allPartnerData.length}
                        </span>
                    )}
                </div>
                <div className="chart-controls-row">
                    <div className="legend-pills">
                        <span className="pill green">■ Success</span>
                        <span className="pill red">■ Failed</span>
                    </div>
                    <Paginator
                        page={partnerPage} total={totalPartnerPages}
                        onPrev={() => setPartnerPage(p => Math.max(0, p - 1))}
                        onNext={() => setPartnerPage(p => Math.min(totalPartnerPages - 1, p + 1))}
                    />
                </div>
                {currentPartnerSlice.length === 0 ? (
                    <div className="empty-state">No partner data</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <ReBarChart
                            data={currentPartnerSlice}
                            layout="vertical"
                            margin={{ top: 2, right: 16, left: 88, bottom: 2 }}
                            barSize={10}
                            barGap={3}
                        >
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fill: "var(--c-text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fill: "var(--c-text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                                tickLine={false}
                                axisLine={false}
                                width={84}
                            />
                            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
                            <Bar dataKey="success" name="Success" fill={COLORS.success} radius={[0, 3, 3, 0]} />
                            <Bar dataKey="failed" name="Failed" fill={COLORS.failed} radius={[0, 3, 3, 0]} />
                        </ReBarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Module Comparison ── */}
            <div className="chart-card">
                <div className="chart-header-row">
                    <span className="chart-card-title">Module Comparison</span>
                    {totalModulePages > 1 && (
                        <span className="chart-card-subtitle">
                            {modulePage * PAGE_SIZE + 1}–{Math.min((modulePage + 1) * PAGE_SIZE, moduleData.length)} of {moduleData.length}
                        </span>
                    )}
                </div>
                <div className="chart-controls-row">
                    <div className="legend-pills">
                        <span className="pill green">■ Success</span>
                        <span className="pill red">■ Failed</span>
                    </div>
                    <Paginator
                        page={modulePage} total={totalModulePages}
                        onPrev={() => setModulePage(p => Math.max(0, p - 1))}
                        onNext={() => setModulePage(p => Math.min(totalModulePages - 1, p + 1))}
                    />
                </div>
                {currentModuleSlice.length === 0 ? (
                    <div className="empty-state">No module data</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <ReBarChart
                            data={currentModuleSlice}
                            margin={{ top: 2, right: 16, left: 4, bottom: 20 }}
                            barSize={14}
                            barGap={3}
                        >
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "var(--c-text-secondary)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fill: "var(--c-text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
                            <Bar dataKey="success" name="Success" fill={COLORS.success} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="failed" name="Failed" fill={COLORS.failed} radius={[3, 3, 0, 0]} />
                        </ReBarChart>
                    </ResponsiveContainer>
                )}
            </div>

        </div>
    );
};

export default React.memo(BarChartComponent);