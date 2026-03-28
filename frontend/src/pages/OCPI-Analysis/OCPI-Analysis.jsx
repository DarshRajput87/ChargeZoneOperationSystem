import React, { useEffect, useState, useCallback } from "react";
import "./OCPIAnalysis.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MODULES = [
    'cdrs', 'cdrs-emsp', 'commands', 'commands-emsp', 'credentials',
    'endpoints', 'locations', 'sessions', 'sessions-emsp', 'singleversion',
    'tariff', 'tariffs', 'tokens'
];

const getLocalYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmt = (n) =>
    n >= 1_000_000
        ? (n / 1_000_000).toFixed(1) + "M"
        : n >= 1_000
            ? (n / 1_000).toFixed(1) + "K"
            : String(n ?? 0);

const pct = (num, den) =>
    den ? ((num / den) * 100).toFixed(1) : "0.0";

/**
 * Determines the CSS class for a status code.
 * OCPI status 1000, 2000-2002 = success, 2003+ = error/warn.
 * HTTP 2xx = success, 4xx/5xx = error.
 * Everything else = warn.
 */
const statusClass = (code) => {
    if (code === null || code === undefined || code === "") return "warn";
    const n = parseInt(code, 10);
    if (isNaN(n)) return "warn";
    // OCPI protocol codes
    if (n === 1000 || (n >= 2000 && n <= 2002)) return "ok";
    if (n > 2002 && n <= 3999) return "err";
    // HTTP codes
    if (n >= 200 && n < 300) return "ok";
    if (n >= 400 && n < 600) return "err";
    return "warn";
};

// ─── Component ────────────────────────────────────────────────────────────────
const OCPIAnalysis = () => {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [modules, setModules] = useState([]);
    const [parties, setParties] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewingMessage, setViewingMessage] = useState(null);

    const [filters, setFilters] = useState({
        date: getLocalYMD(),
        limit: 20,
        module: "",
        party_id: "",
        tenant_id: "",
        status: "",
        booking_type: "ocpi"
    });

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let query = `?date=${filters.date}&limit=${filters.limit}`;
            if (filters.module) query += `&module=${filters.module}`;
            if (filters.party_id) query += `&party_id=${filters.party_id}`;
            if (filters.tenant_id) query += `&tenant_id=${filters.tenant_id}`;
            if (filters.status) query += `&status=${filters.status}`;
            if (filters.booking_type) query += `&booking_type=${filters.booking_type}`;

            const base = "https://api.chargezoneops.online/api/ocpi-analytics";

            const [logsRes, summaryRes, modulesRes] = await Promise.all([
                fetch(`${base}/logs${query}`),
                fetch(`${base}/summary${query}`),
                fetch(`${base}/modules${query}`),
            ]);

            const [logsData, summaryData, modulesData] = await Promise.all([
                logsRes.json(),
                summaryRes.json(),
                modulesRes.json(),
            ]);

            setLogs(logsData.data || []);
            setSummary(summaryData.data?.[0] || null);
            setModules(modulesData.data || []);
        } catch (err) {
            console.error("Error fetching OCPI data:", err);
            setError("Unable to reach the OCPI API. Check that the server is running.");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetch("https://api.chargezoneops.online/api/ocpi-analytics/all-parties")
            .then(res => res.json())
            .then(data => setParties(data.data || []))
            .catch(console.error);

        fetch("https://api.chargezoneops.online/api/ocpi-analytics/tenants")
            .then(res => res.json())
            .then(data => setTenants(data.data || []))
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ── Derived numbers ──────────────────────────────────────────────────────
    const total = summary?.total ?? 0;
    const success = summary?.success ?? 0;
    const failed = total - success;
    const rate = pct(success, total);

    const setFilter = (key, val) =>
        setFilters(f => ({ ...f, [key]: val }));

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="ocpi-dashboard">

            {/* ── Header ── */}
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="header-badge">Live · OCPI Protocol</span>
                    <h1 className="dashboard-title">
                        OCPI <span>Analytics</span>
                    </h1>
                    <p className="dashboard-subtitle">
                        Open Charge Point Interface · Network Overview
                    </p>
                </div>

                {/* ── Filter Grid ── */}
                <div className="filter-bar">

                    {/* Row 1 */}
                    <div className="filter-group">
                        <label className="filter-label">Date</label>
                        <input
                            className="filter-input"
                            type="date"
                            value={filters.date}
                            onChange={e => setFilter("date", e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Rows</label>
                        <select
                            className="filter-input"
                            value={filters.limit}
                            onChange={e => setFilter("limit", Number(e.target.value))}
                        >
                            {[10, 20, 50, 100].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Module</label>
                        <select
                            className="filter-input"
                            value={filters.module}
                            onChange={e => setFilter("module", e.target.value)}
                        >
                            <option value="">All</option>
                            {MODULES.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Tenant</label>
                        <select
                            className="filter-input"
                            value={filters.tenant_id}
                            onChange={e => setFilter("tenant_id", e.target.value) || setFilter("party_id", "")}
                        >
                            <option value="">All</option>
                            {tenants.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2 */}
                    <div className="filter-group">
                        <label className="filter-label">Party</label>
                        <select
                            className="filter-input"
                            value={filters.party_id}
                            onChange={e => setFilter("party_id", e.target.value)}
                        >
                            <option value="">All</option>
                            {parties
                                .filter(p => !filters.tenant_id || p.tenant === filters.tenant_id)
                                .map(p => (
                                    <option key={p.party_id} value={p.party_id}>
                                        {p.partner_name || p.party_id}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Status</label>
                        <select
                            className="filter-input"
                            value={filters.status}
                            onChange={e => setFilter("status", e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Type</label>
                        <select
                            className="filter-input"
                            value={filters.booking_type}
                            onChange={e => setFilter("booking_type", e.target.value)}
                        >
                            <option value="ocpi">OCPI</option>
                            <option value="non-ocpi">Non-OCPI</option>
                            <option value="">All</option>
                        </select>
                    </div>

                    <div className="filter-refresh-group">
                        <button
                            className="refresh-btn"
                            onClick={fetchData}
                            disabled={loading}
                        >
                            <span className="icon" style={{ display: 'inline-block', animation: loading ? 'spin 0.7s linear infinite' : 'none' }}>⟳</span>
                            {loading ? "Loading…" : "Refresh"}
                        </button>
                    </div>

                </div>
            </header>

            {/* ── KPI Cards ── */}
            <div className="kpi-grid">
                <KpiCard
                    className="total"
                    label="Total Requests"
                    value={fmt(total)}
                    sub={`Limit: ${filters.limit} rows shown`}
                    icon="📡"
                    accent="highlight-cyan"
                />
                <KpiCard
                    className="success"
                    label="Successful"
                    value={fmt(success)}
                    sub="Status 2xx responses"
                    icon="✅"
                    accent="highlight-green"
                    progress={parseFloat(rate)}
                />
                <KpiCard
                    className="rate"
                    label="Success Rate"
                    value={`${rate}%`}
                    sub={`${failed.toLocaleString()} requests failed`}
                    icon="📊"
                    accent="highlight-amber"
                    progress={parseFloat(rate)}
                />
                <KpiCard
                    className="failed"
                    label="Failed"
                    value={fmt(failed)}
                    sub="Non-2xx responses"
                    icon="⚠️"
                    accent="highlight-red"
                    progress={total ? (failed / total) * 100 : 0}
                />
            </div>

            {/* ── Body Grid ── */}
            <div className="body-grid">

                {/* Module Stats */}
                <aside className="panel">
                    <div className="panel-header">
                        <span className="panel-title">
                            <span className="panel-title-dot" />
                            Module Stats
                        </span>
                        <span className="panel-count">{MODULES.length}</span>
                    </div>
                    <div className="panel-body">
                        {loading && modules.length === 0 ? (
                            <Loader />
                        ) : (
                            MODULES.map((mName, i) => {
                                const m = modules.find(x => x._id === mName) || { _id: mName, success: 0, total: 0 };
                                const modulePct = m.total ? (m.success / m.total) * 100 : 0;
                                const pctColor = modulePct >= 90
                                    ? "var(--accent-green)"
                                    : modulePct === 0
                                        ? "var(--accent-red)"
                                        : "var(--accent-amber)";
                                return (
                                    <div className="module-row" key={i}>
                                        <div className="module-meta">
                                            <span className="module-name">{m._id}</span>
                                            <span className="module-counts">
                                                <span className="ok">{m.success.toLocaleString()}</span>
                                                <span className="sep">/</span>
                                                <span className="tot">{m.total.toLocaleString()}</span>
                                                <span className="sep">·</span>
                                                <span style={{ color: pctColor }}>
                                                    {modulePct.toFixed(1)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="module-bar-track">
                                            <div
                                                className={`module-bar-fill${modulePct === 0 ? " zero" : ""}`}
                                                style={{ width: `${modulePct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Logs Table */}
                <section className="panel logs-panel">
                    <div className="panel-header">
                        <span className="panel-title">
                            <span className="panel-title-dot" />
                            Request Logs
                        </span>
                        <span className="panel-count">{logs.length} rows</span>
                    </div>

                    {loading ? (
                        <Loader />
                    ) : error ? (
                        <EmptyState msg={error} />
                    ) : logs.length === 0 ? (
                        <EmptyState msg="No logs for selected date" />
                    ) : (
                        <div className="table-wrap">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Module</th>
                                        <th>Partner</th>
                                        <th>Party</th>
                                        <th>Charger</th>
                                        <th>Status</th>
                                        <th style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const sc = log.status_code ?? "—";
                                        const cls = statusClass(log.status_code);
                                        const isNonOcpi = !log.partner_name && !log.party_id;
                                        return (
                                            <tr key={log._id}>
                                                <td className="time-col">
                                                    {new Date(log.createdAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                    })}
                                                </td>
                                                <td className="module-col">{log.module}</td>
                                                <td className="partner-col">
                                                    {log.partner_name ?? "—"}
                                                    {isNonOcpi && (
                                                        <span className="tag-non-ocpi">Non-OCPI</span>
                                                    )}
                                                </td>
                                                <td>{log.party_id ?? "—"}</td>
                                                <td>{log.charger_id ?? "—"}</td>
                                                <td>
                                                    <div className="status-cell">
                                                        <span className={`status-badge ${cls}`}>{sc}</span>
                                                        {log.status_message && (
                                                            <>
                                                                <span className="status-message">
                                                                    {log.status_message}
                                                                </span>
                                                                <button
                                                                    className="view-msg-btn"
                                                                    title="View full message"
                                                                    onClick={() => setViewingMessage(log.status_message)}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        className="copy-btn"
                                                        title="Copy Request ID"
                                                        onClick={() => navigator.clipboard.writeText(log._id)}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* ── Full Message Modal ── */}
            {viewingMessage && (
                <div className="msg-modal-overlay" onClick={() => setViewingMessage(null)}>
                    <div className="msg-modal" onClick={e => e.stopPropagation()}>
                        <div className="msg-modal-header">
                            <span className="msg-modal-title">Status Message</span>
                            <button className="msg-modal-close" onClick={() => setViewingMessage(null)}>✕</button>
                        </div>
                        <div className="msg-modal-body">
                            {viewingMessage}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const KpiCard = ({ className, label, value, sub, icon, accent, progress }) => (
    <div className={`kpi-card ${className}`}>
        <span className="kpi-icon">{icon}</span>
        <p className="kpi-label">{label}</p>
        <p className={`kpi-value ${accent}`}>{value}</p>
        <p className="kpi-sub">{sub}</p>
        {progress !== undefined && (
            <div className="kpi-progress-track">
                <div
                    className="kpi-progress-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
        )}
    </div>
);

const Loader = () => (
    <div className="loading-overlay">
        <div className="spinner" />
        FETCHING DATA…
    </div>
);

const EmptyState = ({ msg }) => (
    <div className="empty-state">— {msg} —</div>
);

export default OCPIAnalysis;