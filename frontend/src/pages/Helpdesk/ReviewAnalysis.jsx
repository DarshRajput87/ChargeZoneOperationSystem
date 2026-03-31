import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import API from "../../services/api";

// ── Lucide-style inline SVG icons (no emoji, no external deps) ──
const Icons = {
  AlertTriangle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Star: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Clock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Tag: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ChevronUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  XCircle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  BarChart2: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

const PALETTE = {
  red: "#f87171",
  amber: "#fbbf24",
  purple: "#a78bfa",
  teal: "#2dd4bf",
  blue: "#60a5fa",
  indigo: "#818cf8",
};

const ISSUE_COLORS = {
  "App Complexity": PALETTE.purple,
  "Payment": PALETTE.amber,
  "Payment Issue": PALETTE.amber,
  "Slow Charging": PALETTE.teal,
  "Charger Issue": PALETTE.red,
  "Charging Issue": PALETTE.red,
  "App Bug": PALETTE.blue,
  "Other": PALETTE.indigo,
};

const getIssueTags = (comment = "", item = {}) => {
  const historyTags = item.history?.slice().reverse().find(h => h.tags?.length > 0)?.tags || [];
  const allTags = [...new Set([...historyTags, ...(item.tags || [])])];
  if (allTags.length > 0) return allTags;
  const text = comment.toLowerCase();
  if (text.includes("complex") || text.includes("confusing")) return ["App Complexity"];
  if (text.includes("payment") || text.includes("refund")) return ["Payment"];
  if (text.includes("slow")) return ["Slow Charging"];
  if (text.includes("not working") || text.includes("error")) return ["Charger Issue"];
  return ["Other"];
};

// ── Sub-components ──

const StarRating = ({ rating }) => {
  const color = rating <= 2 ? PALETTE.red : rating === 3 ? PALETTE.amber : PALETTE.teal;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="13" height="13" viewBox="0 0 24 24"
          fill={s <= rating ? color : "none"}
          stroke={s <= rating ? color : "#2e3347"}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span style={{ fontSize: 11, color: "#5a6178", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>{rating}/5</span>
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    padding: "2px 9px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3,
    background: color + "18",
    color: color,
    border: `1px solid ${color}30`,
  }}>{label}</span>
);

const KpiCard = ({ label, value, accent, sub, Icon }) => (
  <div style={{
    background: "#111621",
    borderRadius: 10,
    padding: "22px 20px",
    border: "1px solid #1c2133",
    borderLeft: `3px solid ${accent}`,
    display: "flex", flexDirection: "column", gap: 6,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 16, right: 16,
      color: accent, opacity: 0.35,
    }}>
      <Icon />
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: "#3d4560", textTransform: "uppercase" }}>
      {label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: "#e8eaf2", letterSpacing: -1, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: accent, opacity: 0.75 }}>{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, count } = payload[0].payload;
  return (
    <div style={{
      background: "#0d1017", border: "1px solid #1c2133",
      borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "#c8cce0",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
      <div style={{ color: ISSUE_COLORS[name] || PALETTE.indigo }}>{count} review{count !== 1 ? "s" : ""}</div>
    </div>
  );
};

// ── Main Component ──

export default function ReviewAnalysis() {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("dateTime");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    API.get("/review-analysis?HelpNeeded=yes")
      .then(res => {
        const rows = (res.data.data || []).filter(i => i.rating <= 3);
        setData(rows);
        buildKpis(rows);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load data. Make sure the server is running.");
        setLoading(false);
      });
  }, []);

  const buildKpis = (rows) => {
    if (!rows.length) return;
    let ratingSum = 0;
    const issues = {};
    rows.forEach(item => {
      ratingSum += item.rating;
      getIssueTags(item.comment, item).forEach(tag => {
        issues[tag] = (issues[tag] || 0) + 1;
      });
    });
    const pendingCount = rows.filter(r => !r.attendedBy).length;
    setKpis({
      total: rows.length,
      avgRating: (ratingSum / rows.length).toFixed(2),
      pendingCount,
      pendingPercent: ((pendingCount / rows.length) * 100).toFixed(1),
      issues,
    });
  };

  const issueChartData = kpis
    ? Object.entries(kpis.issues).map(([name, count]) => ({ name, count }))
    : [];

  const filtered = data
    .filter(item =>
      [item.station, item.comment, item.mobile, item.attendedBy || ""]
        .join(" ").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "dateTime") { av = new Date(av); bv = new Date(bv); }
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.2, marginLeft: 4 }}><Icons.ChevronDown /></span>;
    return <span style={{ color: PALETTE.teal, marginLeft: 4 }}>
      {sortDir === "asc" ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
    </span>;
  };

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>EV Charging · Support Intelligence</div>
          <h1 style={S.title}>Review Analysis</h1>
          <div style={S.subtitle}>Critical reviews · Rated 1–3 · Requires attention</div>
        </div>
        <div style={S.liveIndicator}>
          <div style={S.liveDot} />
          <span style={{ fontSize: 11, color: "#2dd4bf", letterSpacing: 1, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* ── KPI Row ── */}
      {kpis && (
        <div style={S.kpiRow}>
          <KpiCard label="Critical Reviews" value={kpis.total} accent={PALETTE.red} sub="Rated 1–3 stars" Icon={Icons.AlertTriangle} />
          <KpiCard label="Avg Rating" value={`${kpis.avgRating} / 5`} accent={PALETTE.amber} sub="All 3 stars or below" Icon={Icons.Star} />
          <KpiCard label="Unattended" value={`${kpis.pendingCount}`} accent={PALETTE.purple} sub={`${kpis.pendingPercent}% need follow-up`} Icon={Icons.Clock} />
          <KpiCard label="Issue Categories" value={Object.keys(kpis.issues).length} accent={PALETTE.teal} sub="Distinct types found" Icon={Icons.Tag} />
        </div>
      )}

      {/* ── Middle row: chart + issue list ── */}
      {kpis && (
        <div style={S.middleRow}>

          {/* Chart */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardIcon}><Icons.BarChart2 /></span>
              <span style={S.cardTitle}>Issue Breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={issueChartData} barCategoryGap="40%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#3d4560", fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#3d4560", fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff06" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {issueChartData.map((entry, i) => (
                    <Cell key={i} fill={ISSUE_COLORS[entry.name] || PALETTE.indigo} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Issue summary */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardIcon}><Icons.Tag /></span>
              <span style={S.cardTitle}>Issue Summary</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(kpis.issues)
                .sort((a, b) => b[1] - a[1])
                .map(([key, val]) => {
                  const color = ISSUE_COLORS[key] || PALETTE.indigo;
                  const pct = ((val / kpis.total) * 100).toFixed(0);
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Badge label={key} color={color} />
                        <span style={{ fontSize: 12, color: "#3d4560", fontVariantNumeric: "tabular-nums" }}>
                          {val} · {pct}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#1c2133", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4,
                          background: color,
                          width: `${pct}%`,
                          transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={S.cardHeader}>
            <span style={S.cardIcon}><Icons.AlertTriangle /></span>
            <span style={S.cardTitle}>Request Details</span>
          </div>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}><Icons.Search /></span>
            <input
              style={S.searchInput}
              placeholder="Search by station, comment, user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={S.empty}>Loading data…</div>
        ) : error ? (
          <div style={{ ...S.empty, color: PALETTE.red }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>No results found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {[
                    { label: "Station", field: "station" },
                    { label: "Rating", field: "rating" },
                    { label: "Issues", field: null },
                    { label: "Comment", field: null },
                    { label: "User", field: null },
                    { label: "Attended By", field: null },
                    { label: "Date", field: "dateTime" },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      style={{ ...S.th, cursor: field ? "pointer" : "default" }}
                      onClick={() => field && handleSort(field)}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                        {label}
                        {field && <SortIcon field={field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const tags = getIssueTags(item.comment, item);
                  return (
                    <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "transparent" : "#0d1017" }}>
                      <td style={S.td}>
                        <span style={S.stationBadge}>{item.station}</span>
                      </td>
                      <td style={S.td}><StarRating rating={item.rating} /></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {tags.map(tag => <Badge key={tag} label={tag} color={ISSUE_COLORS[tag] || PALETTE.indigo} />)}
                        </div>
                      </td>
                      <td style={{ ...S.td, color: "#3d4560", maxWidth: 220, fontSize: 12 }}>
                        {item.comment || <span style={{ color: "#252b3d" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, color: "#3d4560" }}>
                        {item.mobile}
                      </td>
                      <td style={S.td}>
                        {item.attendedBy ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: PALETTE.teal, fontSize: 12, fontWeight: 600 }}>
                            <Icons.CheckCircle /> {item.attendedBy}
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: PALETTE.red, fontSize: 12, fontWeight: 500 }}>
                            <Icons.XCircle /> Pending
                          </span>
                        )}
                      </td>
                      <td style={{ ...S.td, color: "#3d4560", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(item.dateTime).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit", hour12: true
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──
const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0d14",
    padding: "32px 28px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#c8cce0",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 3,
    color: "#2dd4bf",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: 700,
    color: "#e8eaf2",
    margin: 0,
    letterSpacing: -1,
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#2e3347",
    letterSpacing: 0.3,
  },
  liveIndicator: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#0d1017",
    border: "1px solid #1c2133",
    borderRadius: 20,
    padding: "6px 14px",
    marginTop: 4,
  },
  liveDot: {
    width: 7, height: 7,
    borderRadius: "50%",
    background: "#2dd4bf",
    boxShadow: "0 0 8px #2dd4bf88",
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  middleRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 14,
    marginBottom: 20,
  },
  card: {
    background: "#111621",
    borderRadius: 10,
    padding: "20px 20px",
    border: "1px solid #1c2133",
  },
  cardHeader: {
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 18,
  },
  cardIcon: {
    color: "#2e3347",
    display: "flex", alignItems: "center",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: "#2e3347",
    textTransform: "uppercase",
  },
  searchWrap: {
    position: "relative",
    display: "flex", alignItems: "center",
  },
  searchIcon: {
    position: "absolute", left: 11, color: "#2e3347",
    display: "flex", alignItems: "center", pointerEvents: "none",
  },
  searchInput: {
    background: "#0a0d14",
    border: "1px solid #1c2133",
    borderRadius: 7,
    padding: "8px 14px 8px 34px",
    color: "#c8cce0",
    fontSize: 12,
    outline: "none",
    minWidth: 300,
    fontFamily: "inherit",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "9px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "#2e3347",
    textTransform: "uppercase",
    borderBottom: "1px solid #1c2133",
    whiteSpace: "nowrap",
    userSelect: "none",
  },
  td: {
    padding: "11px 14px",
    borderBottom: "1px solid #111621",
    verticalAlign: "middle",
    color: "#8b90a8",
  },
  stationBadge: {
    background: "#161d2e",
    border: "1px solid #1c2e4a",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    color: "#60a5fa",
    whiteSpace: "nowrap",
  },
  empty: {
    textAlign: "center",
    padding: "48px 0",
    color: "#2e3347",
    fontSize: 13,
  },
};