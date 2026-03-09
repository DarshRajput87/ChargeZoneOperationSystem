import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "../../layouts/DashboardLayout";
import EVLoader from "./EVLoader.jsx";
import "./dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

const BASE_URL = `${API_URL}`;
const COLORS = ["#00d4aa", "#818cf8", "#fbbf24", "#e8303a", "#fb923c"];

const formatNumber = (num) =>
  new Intl.NumberFormat("en-IN").format(num || 0);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-name">{payload[0].name}</div>
      <div className="chart-tooltip-val" style={{ color: payload[0].payload.fill }}>
        {formatNumber(payload[0].value)}
      </div>
    </div>
  );
};

// ── SERVER STATUS BADGE ──────────────────────────────────────────
const ServerBadge = ({ status }) => {
  const map = {
    online: { dot: "#00d4aa", label: "Server Online", bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.2)" },
    offline: { dot: "#e8303a", label: "Server Offline", bg: "rgba(232,48,58,0.08)", border: "rgba(232,48,58,0.2)" },
    checking: { dot: "#fbbf24", label: "Checking...", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
  };
  const s = map[status] ?? map.checking;
  return (
    <div className="server-badge" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span
        className={`server-dot${status === "online" ? " server-dot--pulse" : ""}`}
        style={{ background: s.dot }}
      />
      <span className="server-badge-label" style={{ color: s.dot }}>{s.label}</span>
    </div>
  );
};

// ── DASHBOARD ────────────────────────────────────────────────────
const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [serverStatus, setServerStatus] = useState("checking");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Ping server health, fallback to metrics endpoint
  const checkServer = useCallback(async () => {
    setServerStatus("checking");
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 4000 });
      setServerStatus("online");
      return true;
    } catch {
      try {
        await axios.get(`${BASE_URL}/api/dashboard/metrics`, { timeout: 4000 });
        setServerStatus("online");
        return true;
      } catch {
        setServerStatus("offline");
        return false;
      }
    }
  }, []);

  // Fetch dashboard metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/dashboard/metrics`, { timeout: 8000 });
      setMetrics(res.data.data);
      setLastUpdated(new Date());
      setServerStatus("online");
    } catch (err) {
      console.error(err);
      setServerStatus("offline");
    }
  }, []);

  // Full refresh: ping → fetch
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const isUp = await checkServer();
    if (isUp) await fetchMetrics();
    setRefreshing(false);
  }, [checkServer, fetchMetrics]);

  // Mount: initial load + auto-refresh every 60s
  useEffect(() => {
    handleRefresh();
    const interval = setInterval(handleRefresh, 60_000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const chargerData = metrics ? [
    { name: "Available", value: metrics.chargerStats.available ?? 0 },
    { name: "In Use", value: metrics.chargerStats.inUse ?? 0 },
    { name: "Unavailable", value: metrics.chargerStats.unavailable ?? 0 },
    { name: "Power Loss", value: metrics.chargerStats.powerLoss ?? 0 },
    { name: "Faulted", value: metrics.chargerStats.faulted ?? 0 },
  ] : [];

  const total = metrics?.chargerStats?.total || 0;

  return (
    <DashboardLayout>
      <div className="dashboard-page">

        {/* ── INITIAL LOADER ── */}
        {!metrics && serverStatus !== "offline" && (
          <EVLoader text="Connecting to Grid..." />
        )}

        {/* ── OFFLINE / ERROR STATE ── */}
        {!metrics && serverStatus === "offline" && (
          <div className="offline-state">
            <div className="offline-icon">⚡</div>
            <div className="offline-title">Server Unreachable</div>
            <div className="offline-sub">Could not connect to {BASE_URL}</div>
            <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
              <span className={`refresh-icon${refreshing ? " refresh-icon--spin" : ""}`}>↻</span>
              {refreshing ? "Retrying..." : "Retry Connection"}
            </button>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        {metrics && <>

          {/* Top bar: server status + refresh */}
          <div className="dash-topbar">
            <ServerBadge status={serverStatus} />
            <div className="topbar-right">
              {lastUpdated && (
                <span className="last-updated">
                  Updated {lastUpdated.toLocaleTimeString("en-IN")}
                </span>
              )}
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
              >
                <span className={`refresh-icon${refreshing ? " refresh-icon--spin" : ""}`}></span>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* KPI GRID */}
          <p className="section-label">Overview</p>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--teal">🏢</div>
              <div className="kpi-value">{formatNumber(metrics.totalTenants)}</div>
              <div className="kpi-label">Total Tenants</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--purple">⚡</div>
              <div className="kpi-value">{formatNumber(metrics.evServed)}</div>
              <div className="kpi-label">EV Sessions Completed</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--yellow">🔋</div>
              <div className="kpi-value">
                {formatNumber(Number(metrics.totalEnergy ?? 0).toFixed(0))}
              </div>
              <div className="kpi-label">kWh Energy Delivered</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--red">🔌</div>
              <div className="kpi-value">{formatNumber(total)}</div>
              <div className="kpi-label">Total Chargers</div>
            </div>
          </div>

          {/* CHART ROW */}
          <p className="section-label">Charger Health</p>
          <div className="chart-row">

            {/* Donut */}
            <div className="chart-card">
              <div className="chart-card-title">Status Distribution</div>
              <div className="chart-card-sub">All chargers · Real-time</div>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chargerData}
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {chargerData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <div className="donut-total">{formatNumber(total)}</div>
                  <div className="donut-sub">Total</div>
                </div>
              </div>
              <hr className="chart-divider" />
              <ul className="legend-list">
                {chargerData.map((item, i) => (
                  <li key={i} className="legend-item">
                    <div className="legend-left">
                      <div className="legend-dot" style={{ background: COLORS[i] }} />
                      <span>{item.name}</span>
                    </div>
                    <div className="legend-val">{formatNumber(item.value)}</div>
                  </li>
                ))}
              </ul>
              <p className="updated-at">
                Updated {new Date(metrics.updatedAt).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Bar breakdown */}
            <div className="chart-card">
              <div className="chart-card-title">Charger Breakdown</div>
              <div className="chart-card-sub">% share of total fleet</div>
              <ul className="status-list">
                {chargerData.map((item, i) => {
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <li key={i} className="status-row">
                      <div className="status-name">{item.name}</div>
                      <div className="status-bar-bg">
                        <div
                          className="status-bar-fill"
                          style={{ width: `${pct}%`, background: COLORS[i] }}
                        />
                      </div>
                      <div className="status-pct">{pct}%</div>
                      <div className="status-count">{formatNumber(item.value)}</div>
                    </li>
                  );
                })}
              </ul>
            </div>

          </div>
        </>}

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;