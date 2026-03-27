import { useEffect, useState } from "react";
import axios from "axios";
import EVLoader from "./EVLoader.jsx";
import "./InProgressSLA.css";

const BASE_URL = "http://api.chargezoneops.online/api/emsp-in-progress";
const SETTLEMENT_PREVIEW = "http://api.chargezoneops.online/api/settlement/preview";
const SETTLEMENT_PUSH = "http://api.chargezoneops.online/api/settlement/push";
const SCRIPT_PUSH = "http://api.chargezoneops.online/api/emsp-in-progress/script-push";
const SCRIPT_PREVIEW = "http://api.chargezoneops.online/api/emsp-in-progress/script-preview";


/* ───────── Deep flatten ───────── */
function flattenObject(obj, prefix = "") {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      result.push([fullKey, value]);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result.push([fullKey, "[ empty ]"]);
      } else {
        value.forEach((item, idx) => {
          if (item !== null && typeof item === "object") {
            result.push(...flattenObject(item, `${fullKey}[${idx}]`));
          } else {
            result.push([`${fullKey}[${idx}]`, item]);
          }
        });
      }
    } else if (typeof value === "object") {
      result.push(...flattenObject(value, fullKey));
    } else {
      result.push([fullKey, value]);
    }
  }
  return result;
}

/* ───────── Tooltip ───────── */
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "default" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: "absolute",
          bottom: "calc(100% + 7px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0d1f33",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          padding: "7px 11px",
          fontSize: "11.5px",
          color: "#c8d9ec",
          whiteSpace: "normal",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
          lineHeight: 1.5,
          maxWidth: "220px",
          textAlign: "center",
          minWidth: "120px",
        }}>
          {text}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            borderWidth: "5px", borderStyle: "solid",
            borderColor: "rgba(13,31,51,1) transparent transparent transparent"
          }} />
        </span>
      )}
    </span>
  );
}

/* ───────── Info icon ───────── */
function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: "12px", height: "12px", opacity: 0.4, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ───────── Column header with tooltip ───────── */
function ThWithTip({ label, tip }) {
  return (
    <th>
      <Tooltip text={tip}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          {label}
          <InfoIcon />
        </span>
      </Tooltip>
    </th>
  );
}


/* ───────── Field descriptions ───────── */
const FIELD_DESCRIPTIONS = {
  bookingId: "Unique reference ID for this charging session booking",
  partyId: "The EMSP party / operator that owns this session",
  status: "Current lifecycle state — in_progress means actively charging, completed means CDR has been pushed",
  bookingStartTime: "Timestamp when the EV charging session began",
  bookingEndTime: "Timestamp when the EV charging session was terminated",
  tenantId: "The tenant / organisation this session belongs to",
  sessionId: "Internal session reference ID assigned by the CPO",
  evseId: "ID of the Electric Vehicle Supply Equipment (the physical charger unit)",
  connectorId: "Physical connector port used during this charging event",
  kwh: "Total energy delivered to the vehicle in kilowatt-hours",
  totalCost: "Calculated charge cost for this session based on the tariff",
  currency: "Currency used for billing (e.g. EUR, GBP)",
  authId: "Token or RFID used to authorise the session start",
  locationId: "ID of the charging station / location",
  countryCode: "Country where the charging event occurred",
  cdrSent: "Whether a Charge Detail Record (CDR) was successfully pushed to the operator",
  failureReason: "Reason the session ended abnormally, if applicable",
  lastUpdated: "When this record was last modified in the system",
  createdAt: "When this record was first created in the system",
};

function FlatCard({ label, value }) {
  const display = value === null || value === undefined ? "—" : String(value);

  const getValueClass = () => {
    if (value === null || value === undefined) return "ipsl-sv-null";
    if (typeof value === "boolean") return "ipsl-sv-bool";
    if (typeof value === "number") return "ipsl-sv-number";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "ipsl-sv-date";
    if (typeof value === "string" && /^[0-9a-f]{16,}$/i.test(value)) return "ipsl-sv-hash";
    return "ipsl-sv-string";
  };

  const parts = label.split(".");
  const shortLabel = parts[parts.length - 1].replace(/\[(\d+)\]$/, " [$1]");
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(" › ") : null;
  const lastKey = parts[parts.length - 1].replace(/\[\d+\]$/, "");
  const description = FIELD_DESCRIPTIONS[lastKey];

  return (
    <div className="ipsl-flat-card">
      {parentPath && <span className="ipsl-flat-card-parent">{parentPath}</span>}
      <span className="ipsl-flat-card-label" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {shortLabel}
        {description && <Tooltip text={description}><InfoIcon /></Tooltip>}
      </span>
      <span className={`ipsl-flat-card-value ${getValueClass()}`}>{display}</span>
    </div>
  );
}

/* ───────── Method Selection Modal ───────── */
function MethodSelectionModal({ session, onSelect, onClose }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="ipsl-modal" onClick={onClose}>
      <div className="ipsl-modal-content ipsl-method-select-modal" onClick={e => e.stopPropagation()}
        style={{ width: "520px", background: "#0b1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", overflow: "hidden" }}>

        <div className="ipsl-modal-header"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, transparent 55%)", borderBottom: "1px solid rgba(239,68,68,0.1)", padding: "22px 26px 20px" }}>
          <div className="ipsl-settle-header-left">
            <span className="ipsl-settle-eyebrow">Force Settlement</span>
            <h3 style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em" }}>Choose Settlement Method</h3>
          </div>
          <button className="ipsl-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="ipsl-settle-identity">
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Booking ID</span><span className="ipsl-chip-mono">{session.bookingId}</span></div>
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Party</span><span className="ipsl-chip-mono">{session.partyId}</span></div>
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Status</span><span className="ipsl-chip-status">{session.status}</span></div>
        </div>

        <div style={{ padding: "20px 22px 8px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px", letterSpacing: "0.01em", lineHeight: 1.6 }}>
            Select how you want to close this session. Both methods will push a CDR to the operator.
          </p>
          <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
            {[
              { key: "cdr", icon: "🔧", title: "CDR Builder", color: "#7eb8f7", rgb: "59,130,246", desc: "Interactively review and edit the settlement payload before pushing to the operator." },
              { key: "script", icon: "⚡", title: "Script", color: "#f87171", rgb: "239,68,68", desc: "Automatically generate and push the CDR using the pre-built settlement script." },
            ].map(({ key, icon, title, color, rgb, desc }) => (
              <button key={key}
                onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(key)}
                style={{
                  display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px",
                  background: hovered === key ? `rgba(${rgb},0.1)` : `rgba(${rgb},0.045)`,
                  border: hovered === key ? `1px solid rgba(${rgb},0.45)` : `1px solid rgba(${rgb},0.2)`,
                  borderRadius: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.18s ease",
                  transform: hovered === key ? "translateY(-1px)" : "translateY(0)",
                  boxShadow: hovered === key ? `0 4px 20px rgba(${rgb},0.15)` : "none",
                }}>
                <div style={{ width: "42px", height: "42px", flexShrink: 0, borderRadius: "10px", background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color, marginBottom: "4px", letterSpacing: "-0.01em" }}>{title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
                </div>
                <div style={{ color: hovered === key ? color : "var(--text-muted)", fontSize: "18px", transition: "color 0.15s ease, transform 0.15s ease", transform: hovered === key ? "translateX(3px)" : "translateX(0)", flexShrink: 0 }}>→</div>
              </button>
            ))}
          </div>
        </div>

        <div className="ipsl-modal-footer" style={{ padding: "16px 22px", justifyContent: "flex-end" }}>
          <button className="ipsl-modal-close-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Script Confirm Modal ───────── */
function ScriptConfirmModal({ session, onConfirm, onClose, pushing, previewData }) {
  return (
    <div className="ipsl-modal" onClick={onClose}>
      <div className="ipsl-modal-content ipsl-method-select-modal" onClick={e => e.stopPropagation()}
        style={{ width: "540px", background: "#0b1520", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px", overflow: "hidden" }}>

        <div className="ipsl-modal-header"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.09) 0%, transparent 55%)", borderBottom: "1px solid rgba(239,68,68,0.12)", padding: "22px 26px 20px" }}>
          <div className="ipsl-settle-header-left">
            <span className="ipsl-settle-eyebrow">Script Settlement</span>
            <h3 style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em" }}>Confirm Auto-Close</h3>
          </div>
          <button className="ipsl-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="ipsl-settle-identity">
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Booking ID</span><span className="ipsl-chip-mono">{session.bookingId}</span></div>
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Party</span><span className="ipsl-chip-mono">{session.partyId}</span></div>
          <div className="ipsl-id-chip"><span className="ipsl-chip-label">Status</span><span className="ipsl-chip-status">{session.status}</span></div>
        </div>

        <div className="ipsl-warning-banner">
          <span className="ipsl-warning-icon">⚠</span>
          <span>
            The script will automatically build and push the CDR to the operator. <strong>This action cannot be undone.</strong>
          </span>
        </div>

        {previewData && (
          <div className="ipsl-api-preview">
            <span className="ipsl-api-eyebrow">Chargecloud API Preview</span>
            <div className="ipsl-api-url-row">
              <span className="ipsl-api-method">POST</span>
              <span className="ipsl-api-url">{previewData.url}</span>
            </div>
            <div className="ipsl-api-payload-box">
              <div className="ipsl-api-payload-header">
                <span style={{ fontSize: "8px", transform: "rotate(90deg)" }}>▶</span>
                VIEW PUSH PAYLOAD (1 SESSION)
              </div>
              <div className="ipsl-api-payload-content">
                {JSON.stringify(previewData.payload, null, 2)}
              </div>
            </div>
          </div>
        )}

        {!previewData && (
          <div style={{ padding: "12px 22px 6px", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.7 }}>
            <p>Loading API preview…</p>
          </div>
        )}

        <div className="ipsl-modal-footer settle" style={{ padding: "16px 22px" }}>
          <button className="ipsl-modal-close-btn" onClick={onClose} disabled={pushing}>Cancel</button>
          <button className="ipsl-btn-settle-confirm" onClick={onConfirm} disabled={pushing}>
            {pushing
              ? <><span className="ipsl-btn-spinner" />Running Script…</>
              : <><span className="ipsl-btn-icon">⚡</span>Run Script</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════════════════════ */
export default function InProgressDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [methodSession, setMethodSession] = useState(null);
  const [settleSession, setSettleSession] = useState(null);
  const [scriptSession, setScriptSession] = useState(null);   // ← script confirm modal
  const [payload, setPayload] = useState(null);
  const [scriptPreviewData, setScriptPreviewData] = useState(null); // ← script API preview
  const [token, setToken] = useState("");
  const [pushing, setPushing] = useState(false);
  const [scriptPushing, setScriptPushing] = useState(false);  // ← script loading state
  const [searchBookingId, setSearchBookingId] = useState("");
  const [selectedParty, setSelectedParty] = useState("all");

  // Pagination
  const limit = 10;
  const [cursorHistory, setCursorHistory] = useState([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [totalCount, setTotalCount] = useState(0); // real total from DB

  useEffect(() => {
    const cursor = cursorHistory[currentPage];
    fetchData(cursor);
    const interval = setInterval(() => fetchData(cursor), 60_000);
    return () => clearInterval(interval);
  }, [currentPage, cursorHistory]);

  const fetchData = async (cursor) => {
    setLoading(true);
    try {
      const res = await axios.get(BASE_URL, { params: { cursor, limit } });
      setSessions(res.data.data);
      setNextCursor(res.data.nextCursor);
      setTotalCount(res.data.total || 0);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const goNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory(prev => { const n = [...prev]; n[currentPage + 1] = nextCursor; return n; });
    setCurrentPage(p => p + 1);
  };
  const goPrevPage = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

  const calculateSLA = (t) => {
    const diff = Date.now() - new Date(t).getTime();
    return { hours: Math.floor(diff / 3_600_000), minutes: Math.floor((diff % 3_600_000) / 60_000) };
  };

  const getSLAClass = (h) =>
    h >= 48 ? "ipsl-badge ipsl-sla-breach"
      : h >= 24 ? "ipsl-badge ipsl-sla-warning"
        : "ipsl-badge ipsl-sla-safe";

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "ipsl-badge status-completed";
    if (s === "in_progress") return "ipsl-badge status";
    return "ipsl-badge status-other";
  };

  const isSettleable = (s) =>
    (s.status || "").toLowerCase() === "in_progress" &&
    calculateSLA(s.bookingStartTime).hours >= 48;

  /* ── Method selection: branch on cdr vs script ── */
  const handleMethodSelect = async (method) => {
    const session = methodSession;
    setMethodSession(null);

    if (method === "script") {
      try {
        const res = await axios.get(`${SCRIPT_PREVIEW}/${session.bookingId}`);
        if (!res.data.success) { alert(res.data.error || "Failed to fetch script preview"); return; }
        setScriptPreviewData(res.data);
        setScriptSession(session);
      } catch {
        alert("Failed to build script preview");
      }
      return;
    }

    // CDR Builder path — fetch preview payload then show settle modal
    try {
      const res = await axios.get(`${SETTLEMENT_PREVIEW}/${session.bookingId}`);
      if (!res.data.success) { alert(res.data.error); return; }
      setPayload(res.data.payload);
      setToken(res.data.token);
      setSettleSession(session);
    } catch {
      alert("Failed to build settlement payload");
    }
  };

  /* ── CDR Builder: push ── */
  const pushSettlement = async () => {
    if (!payload) return;
    setPushing(true);
    try {
      const res = await axios.post(SETTLEMENT_PUSH, { payload, token });
      if (res.data.success) {
        alert("CDR pushed successfully");
        fetchData(cursorHistory[currentPage]);
      } else {
        alert("Push failed");
      }
    } catch {
      alert("Settlement request failed");
    } finally {
      setPushing(false);
      setSettleSession(null);
    }
  };

  /* ── Script: push ── */
  const pushScript = async () => {
    if (!scriptSession) return;
    setScriptPushing(true);
    try {
      const res = await axios.post(SCRIPT_PUSH, {
        bookingIds: [scriptSession.bookingId]
      });
      if (res.data.success) {
        alert("Session closed via script successfully");
        fetchData(cursorHistory[currentPage]);
      } else {
        const firstError = res.data.results?.find(r => !r.success)?.error;
        alert("Script push failed" + (firstError ? `: ${firstError}` : ""));
      }
    } catch {
      alert("Script push request failed");
    } finally {
      setScriptPushing(false);
      setScriptSession(null);
    }
  };

  /* ── Derived ── */
  const partyOptions = ["all", ...Array.from(new Set(sessions.map(s => s.partyId).filter(Boolean))).sort()];

  const visibleSessions = sessions.filter(s => {
    const matchId = !searchBookingId.trim() ||
      s.bookingId?.toLowerCase().includes(searchBookingId.trim().toLowerCase());
    const matchParty = selectedParty === "all" || s.partyId === selectedParty;
    return matchId && matchParty;
  });

  const breachCount = sessions.filter(s => calculateSLA(s.bookingStartTime).hours >= 48).length;
  const warningCount = sessions.filter(s => { const h = calculateSLA(s.bookingStartTime).hours; return h >= 24 && h < 48; }).length;
  const safeCount = sessions.filter(s => calculateSLA(s.bookingStartTime).hours < 24).length;

  const flatPayload = payload ? flattenObject(payload) : [];
  const flatSession = selectedSession ? flattenObject(selectedSession) : [];
  // Only show pagination controls when we're not on the first page or there's more data to fetch
  const showPagination = currentPage > 0 || (!!nextCursor && sessions.length === limit);

  return (
    <div className="ipsl-page">

      {/* ── Header ── */}
      <div className="ipsl-page-header">
        <div className="ipsl-title-group">
          <div className="ipsl-title-row">
            <div className="ipsl-title-icon">
              <svg viewBox="0 0 24 24" fill="none" className="ipsl-title-icon-svg">
                <path d="M13 2L4.5 13H11L10 22L19.5 11H13L13 2Z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <h1 className="ipsl-page-title">EMSP In Progress</h1>
            {lastUpdated && (
              <span className="ipsl-last-updated">
                <span className="ipsl-live-dot" />
                Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="ipsl-page-subtitle">
            Monitor active charging sessions and manage SLA settlements. Completed sessions are processed and moved to history automatically.
          </p>
        </div>

        <div className="ipsl-stats">
          <div className="ipsl-stat-pill breach">
            <span className="ipsl-stat-num">{breachCount}</span>
            <span className="ipsl-stat-label">SLA Breach</span>
          </div>
          <div className="ipsl-stat-divider" />
          <div className="ipsl-stat-pill warning">
            <span className="ipsl-stat-num">{warningCount}</span>
            <span className="ipsl-stat-label">Warning</span>
          </div>
          <div className="ipsl-stat-divider" />
          <div className="ipsl-stat-pill safe">
            <span className="ipsl-stat-num">{safeCount}</span>
            <span className="ipsl-stat-label">On Track</span>
          </div>
          <div className="ipsl-stat-divider" />
          <div className="ipsl-stat-pill total">
            <span className="ipsl-stat-num">{totalCount}</span>
            <span className="ipsl-stat-label">Total</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: "340px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", color: "var(--text-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search booking ID…" value={searchBookingId}
            onChange={e => setSearchBookingId(e.target.value)}
            style={{ width: "100%", paddingLeft: "34px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "rgba(126,184,247,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>

        <div style={{ position: "relative" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "var(--text-muted)", pointerEvents: "none" }}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <select value={selectedParty} onChange={e => setSelectedParty(e.target.value)}
            style={{ paddingLeft: "32px", paddingRight: "28px", paddingTop: "8px", paddingBottom: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: selectedParty === "all" ? "var(--text-muted)" : "#fff", fontSize: "13px", outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", minWidth: "160px" }}>
            {partyOptions.map(p => <option key={p} value={p} style={{ background: "#0b1520" }}>{p === "all" ? "All Parties" : p}</option>)}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "var(--text-muted)", pointerEvents: "none" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {(searchBookingId || selectedParty !== "all") && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>Showing <strong style={{ color: "#7eb8f7" }}>{visibleSessions.length}</strong> of {sessions.length}</span>
            <button onClick={() => { setSearchBookingId(""); setSelectedParty("all"); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", color: "var(--text-muted)", fontSize: "11px", padding: "2px 8px", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="ipsl-table-wrap">
        {loading ? (
          <EVLoader message="Fetching active sessions…" />
        ) : visibleSessions.length === 0 ? (
          <div className="ipsl-empty-state">
            <div className="ipsl-empty-icon">{sessions.length === 0 ? "⚡" : "🔍"}</div>
            <p className="ipsl-empty-title">{sessions.length === 0 ? "No active sessions" : "No matching sessions"}</p>
            <p className="ipsl-empty-sub">{sessions.length === 0 ? "All charging sessions are settled or idle." : "Try adjusting your search or filter criteria."}</p>
          </div>
        ) : (
          <table className="ipsl-table">
            <thead>
              <tr>
                <ThWithTip label="Booking ID" tip="Unique reference ID for this charging session booking" />
                <ThWithTip label="Status" tip="in_progress = actively charging · completed = CDR pushed & session closed" />
                <ThWithTip label="Party" tip="The EMSP party / operator that owns this session" />
                <ThWithTip label="SLA Duration" tip="Time elapsed since session started. 🔴 ≥48h breach · 🟡 ≥24h warning · 🟢 on track" />
                <ThWithTip label="Settle" tip="Force-close a session breaching 48h SLA. Only active for in_progress sessions ≥ 48h" />
                <ThWithTip label="Details" tip="View the full raw session record and all fields" />
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map(s => {
                const { hours, minutes } = calculateSLA(s.bookingStartTime);
                const isCompleted = (s.status || "").toLowerCase() === "completed";
                return (
                  <tr key={s._id} style={{ opacity: isCompleted ? 0.72 : 1, transition: "opacity 0.3s" }}>
                    <td><span className="ipsl-mono">{s.bookingId}</span></td>
                    <td><span className={getStatusBadgeClass(s.status)}>{s.status}</span></td>
                    <td><span className="ipsl-badge party">{s.partyId}</span></td>
                    <td><span className={getSLAClass(hours)}>{hours}h {minutes}m</span></td>
                    <td>
                      <button
                        className={`ipsl-btn-settle ${isSettleable(s) ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                        disabled={!isSettleable(s)}
                        onClick={() => setMethodSession(s)}
                        title={isCompleted ? "Already completed" : !isSettleable(s) ? "Within SLA or not in progress" : "Force settle"}>
                        {isCompleted ? "Done" : "Settle"}
                      </button>
                    </td>
                    <td>
                      <button className="ipsl-btn-view" onClick={() => setSelectedSession(s)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {showPagination && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.012)"
          }}>
            {/* Page info */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--text-muted)"
            }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                background: "rgba(126,184,247,0.1)",
                border: "1px solid rgba(126,184,247,0.2)",
                color: "#7eb8f7",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: "var(--mono)"
              }}>
                {currentPage + 1}
              </span>
              <span>of</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                {Math.ceil(totalCount / limit) || 1} pages
              </span>
              <span style={{
                width: "1px", height: "14px",
                background: "rgba(255,255,255,0.08)",
                margin: "0 4px"
              }} />
              <span style={{ fontFamily: "var(--mono)", color: "var(--text-muted)", fontSize: "11.5px" }}>
                {totalCount} total sessions
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                className="ipsl-pag-btn"
                disabled={currentPage === 0}
                onClick={goPrevPage}
                title="Previous page"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  style={{ width: "14px", height: "14px" }}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>Prev</span>
              </button>

              {/* Dot track */}
              <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "0 4px" }}>
                {Array.from({ length: Math.min(5, Math.ceil(totalCount / limit) || 1) }, (_, i) => {
                  const totalPages = Math.ceil(totalCount / limit) || 1;
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage <= 2) {
                    pageNum = i;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  const isActive = pageNum === currentPage;
                  return (
                    <div
                      key={pageNum}
                      style={{
                        width: isActive ? "22px" : "7px",
                        height: "7px",
                        borderRadius: "99px",
                        background: isActive
                          ? "#7eb8f7"
                          : pageNum < currentPage
                            ? "rgba(126,184,247,0.3)"
                            : "rgba(255,255,255,0.1)",
                        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                        boxShadow: isActive ? "0 0 8px rgba(126,184,247,0.5)" : "none"
                      }}
                    />
                  );
                })}
              </div>

              <button
                className="ipsl-pag-btn ipsl-pag-btn-next"
                disabled={!nextCursor}
                onClick={goNextPage}
                title="Next page"
              >
                <span>Next</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  style={{ width: "14px", height: "14px" }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Method Modal ── */}
      {methodSession && (
        <MethodSelectionModal session={methodSession} onSelect={handleMethodSelect} onClose={() => setMethodSession(null)} />
      )}

      {/* ── Script Confirm Modal ── */}
      {scriptSession && (
        <ScriptConfirmModal
          session={scriptSession}
          onConfirm={pushScript}
          onClose={() => { setScriptSession(null); setScriptPreviewData(null); }}
          pushing={scriptPushing}
          previewData={scriptPreviewData}
        />
      )}

      {/* ── View Modal ── */}
      {selectedSession && (
        <div className="ipsl-modal" onClick={() => setSelectedSession(null)}>
          <div className="ipsl-modal-content ipsl-modal-view" onClick={e => e.stopPropagation()}>
            <div className="ipsl-modal-header ipsl-info-modal-header">
              <div className="ipsl-settle-header-left">
                <span className="ipsl-info-eyebrow">Session Record</span>
                <h3>Session Details</h3>
              </div>
              <button className="ipsl-modal-x" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            <div className="ipsl-settle-identity">
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Booking ID</span><span className="ipsl-chip-mono">{selectedSession.bookingId}</span></div>
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Party</span><span className="ipsl-chip-mono">{selectedSession.partyId}</span></div>
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Status</span><span className="ipsl-chip-status">{selectedSession.status}</span></div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "0 20px 8px", fontSize: "10.5px", color: "var(--text-muted)", alignItems: "center" }}>
              <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Value types:</span>
              {[["String", "ipsl-sv-string"], ["Number", "ipsl-sv-number"], ["Date/Time", "ipsl-sv-date"], ["Boolean", "ipsl-sv-bool"], ["Hash/ID", "ipsl-sv-hash"], ["Null", "ipsl-sv-null"]].map(([lbl, cls]) => (
                <span key={lbl} className={cls} style={{ fontSize: "10.5px" }}>● {lbl}</span>
              ))}
            </div>

            <div className="ipsl-flat-grid-scroll">
              <div className="ipsl-flat-section-label">All Fields <span className="ipsl-flat-count">{flatSession.length}</span></div>
              <div className="ipsl-cards-grid">
                {flatSession.map(([key, val]) => <FlatCard key={key} label={key} value={val} />)}
              </div>
            </div>
            <div className="ipsl-modal-footer">
              <button className="ipsl-modal-close-btn" onClick={() => setSelectedSession(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settlement Modal (CDR Builder) ── */}
      {settleSession && (
        <div className="ipsl-modal" onClick={() => setSettleSession(null)}>
          <div className="ipsl-modal-content ipsl-modal-settle" onClick={e => e.stopPropagation()}>
            <div className="ipsl-modal-header ipsl-settle-modal-header">
              <div className="ipsl-settle-header-left">
                <span className="ipsl-settle-eyebrow">Force Settlement</span>
                <h3>Close Session</h3>
              </div>
              <button className="ipsl-modal-x" onClick={() => setSettleSession(null)}>✕</button>
            </div>
            <div className="ipsl-settle-identity">
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Booking ID</span><span className="ipsl-chip-mono">{settleSession.bookingId}</span></div>
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Party</span><span className="ipsl-chip-mono">{settleSession.partyId}</span></div>
              <div className="ipsl-id-chip"><span className="ipsl-chip-label">Status</span><span className="ipsl-chip-status">{settleSession.status}</span></div>
            </div>
            <div className="ipsl-warning-banner">
              <span className="ipsl-warning-icon">⚠</span>
              <span>
                This will forcefully close the session and push a CDR to the operator. <strong>This action cannot be undone.</strong>
              </span>
            </div>
            {flatPayload.length > 0 && (
              <div className="ipsl-flat-grid-scroll">
                <div className="ipsl-flat-section-label">Settlement Payload <span className="ipsl-flat-count">{flatPayload.length}</span></div>
                <div className="ipsl-cards-grid">
                  {flatPayload.map(([key, val]) => <FlatCard key={key} label={key} value={val} />)}
                </div>
              </div>
            )}
            <div className="ipsl-modal-footer settle">
              <button className="ipsl-modal-close-btn" onClick={() => setSettleSession(null)}>Cancel</button>
              <button className="ipsl-btn-settle-confirm" onClick={pushSettlement} disabled={pushing}>
                {pushing ? <><span className="ipsl-btn-spinner" />Closing…</> : <><span className="ipsl-btn-icon">⚡</span>Close Session</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}