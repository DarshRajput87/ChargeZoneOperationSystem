// ─── OCPIAnalysisChart.jsx ────────────────────────────────────────────────────
// Refactored to be a Pure View component (ChartsDashboard).
// Consumes data from Master Analytics to ensure 100% consistency.

import React from "react";
import { useOCPI } from "../../context/OCPIContext";

import KPICards from "./charts/KPICards";
import BarChartComp from "./charts/BarChart";
import StackedBarChart from "./charts/StackedBarChart";
import PieChartComp from "./charts/PieChart";
import FailureList from "./charts/FailureList";
import Heatmap from "./charts/Heatmap";
import PartyTrafficChart from "./charts/PartyTrafficChart";
import ScatterPlotChart from "./charts/ScatterPlot";

import "./charts/charts.css";
import "./OCPIAnalysisChart.css";

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, label }) => (
    <div className="section-label">
        <span className="section-icon">{icon}</span>
        <span className="section-text">{label}</span>
        <div className="section-line" />
    </div>
);

// ── ChartsDashboard (Pure View) ───────────────────────────────────────────────
export const ChartsDashboard = ({ data, filters = {} }) => {
    if (!data) {
        return <div className="dash-loading-overlay">Initializing analytics…</div>;
    }

    if (!data.summary && (!data.logs || data.logs.length === 0)) {
        return <div className="dash-no-data">No data available for the selected filters.</div>;
    }

    return (
        <div className="charts-view-container">

            {/* ══ SECTION 1 · KPI Cards ══ */}
            <section className="dash-section">
                <SectionLabel icon="📊" label="Summary · Key Metrics" />
                <KPICards summary={data.summary} partners={data.partners} />
            </section>

            {/* ══ SECTION 2 · Party Traffic ══ */}
            <section className="dash-section">
                <SectionLabel icon="🔗" label="Party Traffic · Per-Partner Hourly Breakdown" />
                <PartyTrafficChart date={filters.date} />
            </section>

            {/* ══ SECTION 3 · Scatter Plot ══ */}
            <section className="dash-section">
                <SectionLabel icon="🔬" label="Scatter · Party × Module × Time Matrix" />
                <ScatterPlotChart date={filters.date} />
            </section>

            {/* ══ SECTION 4 · Bar Charts ══ */}
            <section className="dash-section">
                <SectionLabel icon="📊" label="Comparison · Clients & Modules" />
                <BarChartComp partners={data.partners} modules={data.modules} />
            </section>

            {/* ══ SECTION 5 · Stacked Bar ══ */}
            <section className="dash-section">
                <SectionLabel icon="📦" label="Stacked View · Combined Client Insights" />
                <StackedBarChart partners={data.partners} />
            </section>

            {/* ══ SECTION 6 · Pie + Failure List ══ */}
            <section className="dash-section">
                <SectionLabel icon="🥧" label="Distribution · Snapshot View" />
                <div className="two-col-grid">
                    <PieChartComp summary={data.summary} modules={data.modules} />
                    <FailureList failures={data.failures} />
                </div>
            </section>

            {/* ══ SECTION 7 · Heatmap ══ */}
            <section className="dash-section">
                <SectionLabel icon="🔥" label="Heatmap · Failure Pattern Detection" />
                <Heatmap logs={data.logs} />
            </section>

        </div>
    );
};

// ── Standalone Wrapper ────────────────────────────────────────────────────────
const StandaloneChartsPage = () => {
    const { masterData, filters, loading, error, fetchData } = useOCPI();

    return (
        <div className="ocpi-dashboard">
            <header className="dash-header">
                <div className="dash-header-left">
                    <div className="dash-badge">
                        <span className="pulse-dot" />
                        Live · Charts
                    </div>
                    <h1 className="dash-title">OCPI <span>Analytics</span></h1>
                    <p className="dash-subtitle">Visual Intelligence · OCPI Protocol Network</p>
                </div>

                <div className="dash-header-right">
                    <button
                        className="refresh-btn"
                        onClick={() => fetchData()}
                        disabled={loading}
                    >
                        <span style={{ display: "inline-block", animation: loading ? "spin 0.7s linear infinite" : "none" }}>
                            ⟳
                        </span>
                        {loading ? "Syncing…" : "Refresh"}
                    </button>
                </div>
            </header>

            {error && <div className="dash-error">{error}</div>}

            <ChartsDashboard data={masterData} filters={filters} />
        </div>
    );
};

export default StandaloneChartsPage;