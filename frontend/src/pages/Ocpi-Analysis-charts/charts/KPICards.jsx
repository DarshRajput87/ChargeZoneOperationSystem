// ─── components/charts/KPICards.jsx ─────────────────────────────────────────
// Displays summary KPI metrics as styled stat cards.
// Props: summary (raw API response object), partners (raw array)

import React, { useMemo } from "react";
import "./charts.css";
import "./KPICards.css";
import { fmt, pct, formatSummary, formatPartners, getTopFailing } from "../../utils/dataFormatter";

const KPICards = ({ summary, partners = [] }) => {
    // Optimization: Memoize all KPI calculations
    const stats = useMemo(() => formatSummary(summary), [summary]);
    
    const { total, success, failed, rate } = stats;

    const partnerData = useMemo(() => formatPartners(partners), [partners]);
    const topFailing = useMemo(() => getTopFailing(partnerData), [partnerData]);
    const activeClients = useMemo(() => partners.filter(p => (p.total || 0) > 0).length, [partners]);

    return (
        <div className="kpi-grid">
            <KpiCard
                label="Total API Calls"
                value={fmt(total)}
                sub="All requests today"
                icon="📡"
                accent="cyan"
            />
            <KpiCard
                label="Success Rate"
                value={`${rate}%`}
                sub={`${fmt(success)} successful`}
                icon="✅"
                accent="green"
                progress={rate}
            />
            <KpiCard
                label="Failure Rate"
                value={`${pct(failed, total)}%`}
                sub={`${fmt(failed)} failed`}
                icon="⚠️"
                accent="red"
                progress={total ? (failed / total) * 100 : 0}
            />
            <KpiCard
                label="Active Clients"
                value={fmt(activeClients)}
                sub="Partners with activity"
                icon="🤝"
                accent="purple"
            />
            <KpiCard
                label="Top Failing Client"
                value={topFailing?.name ?? "—"}
                sub={topFailing ? `${fmt(topFailing.failed)} failures` : "No data"}
                icon="🔴"
                accent="amber"
            />
        </div>
    );
};

const KpiCard = React.memo(({ label, value, sub, icon, accent, progress }) => (
    <div className={`kpi-card kpi-${accent}`}>
        <div className="kpi-icon-wrap">
            <span className="kpi-icon">{icon}</span>
            <div className={`kpi-icon-glow glow-${accent}`} />
        </div>
        <p className="kpi-label">{label}</p>
        <p className={`kpi-value accent-${accent}`}>{value}</p>
        <p className="kpi-sub">{sub}</p>
        {progress !== undefined && (
            <div className="kpi-progress-track">
                <div
                    className={`kpi-progress-fill fill-${accent}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
        )}
    </div>
));

export default React.memo(KPICards);