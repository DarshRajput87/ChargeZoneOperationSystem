import { useEffect, useState } from "react";
import axios from "axios";
import EVLoader from "./EVLoader.jsx";
import "./InProgressSLA.css";

const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = `${API_URL}/api/emsp-in-progress`;
const SETTLEMENT_PREVIEW = `${API_URL}/api/settlement/preview`;
const SETTLEMENT_PUSH = `${API_URL}/api/settlement/push`;

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

/* ───────── Flat card ───────── */
function FlatCard({ label, value }) {
  const display = value === null || value === undefined ? "—" : String(value);

  const getValueClass = () => {
    if (value === null || value === undefined) return "sv-null";
    if (typeof value === "boolean") return "sv-bool";
    if (typeof value === "number") return "sv-number";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "sv-date";
    if (typeof value === "string" && /^[0-9a-f]{16,}$/i.test(value)) return "sv-hash";
    return "sv-string";
  };

  const parts = label.split(".");
  const shortLabel = parts[parts.length - 1].replace(/\[(\d+)\]$/, " [$1]");
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(" › ") : null;

  return (
    <div className="flat-card">
      {parentPath && <span className="flat-card-parent">{parentPath}</span>}
      <span className="flat-card-label">{shortLabel}</span>
      <span className={`flat-card-value ${getValueClass()}`}>{display}</span>
    </div>
  );
}

/* ───────── Dashboard ───────── */
export default function InProgressDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [settleSession, setSettleSession] = useState(null);
  const [payload, setPayload] = useState(null);
  const [token, setToken] = useState("");
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(BASE_URL);
      setSessions(res.data.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateSLA = (bookingStartTime) => {
    const now = new Date();
    const diff = now - new Date(bookingStartTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const getSLAClass = (hours) => {
    if (hours >= 48) return "sla-breach";
    if (hours >= 24) return "sla-warning";
    return "sla-safe";
  };

  const handleSettle = async (session) => {
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

  const pushSettlement = async () => {
    if (!payload) return;
    setPushing(true);
    try {
      const res = await axios.post(SETTLEMENT_PUSH, { payload, token });
      if (res.data.success) alert("CDR pushed successfully");
      else alert("Push failed");
    } catch {
      alert("Settlement request failed");
    }
    setPushing(false);
    setSettleSession(null);
  };

  // Stats
  const breachCount = sessions.filter(s => calculateSLA(s.bookingStartTime).hours >= 48).length;
  const warningCount = sessions.filter(s => { const h = calculateSLA(s.bookingStartTime).hours; return h >= 24 && h < 48; }).length;
  const safeCount = sessions.filter(s => calculateSLA(s.bookingStartTime).hours < 24).length;

  const flatPayload = payload ? flattenObject(payload) : [];
  const flatSession = selectedSession ? flattenObject(selectedSession) : [];

  return (
    <div className="sla-page">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title-row">
            <div className="page-title-icon">
              <svg viewBox="0 0 24 24" fill="none" className="title-icon-svg">
                <path d="M13 2L4.5 13H11L10 22L19.5 11H13L13 2Z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <h1 className="page-title">EMSP In Progress</h1>
            {lastUpdated && (
              <span className="last-updated">
                <span className="live-dot" />
                Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="page-subtitle">Monitor active charging sessions and manage SLA settlements</p>
        </div>

        {/* Stat pills */}
        <div className="page-stats">
          <div className="stat-pill breach">
            <span className="stat-num">{breachCount}</span>
            <span className="stat-label">SLA Breach</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill warning">
            <span className="stat-num">{warningCount}</span>
            <span className="stat-label">Warning</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill safe">
            <span className="stat-num">{safeCount}</span>
            <span className="stat-label">On Track</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill total">
            <span className="stat-num">{sessions.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      {/* ── Table or Loader ── */}
      <div className="table-wrap">
        {loading ? (
          <EVLoader message="Fetching active sessions…" />
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <p className="empty-title">No active sessions</p>
            <p className="empty-sub">All charging sessions are settled or idle.</p>
          </div>
        ) : (
          <table className="sla-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Status</th>
                <th>Party</th>
                <th>SLA Duration</th>
                <th>Settle</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const { hours, minutes } = calculateSLA(s.bookingStartTime);
                const breach = hours >= 48;
                return (
                  <tr key={s._id}>
                    <td><span className="mono">{s.bookingId}</span></td>
                    <td><span className="badge status">{s.status}</span></td>
                    <td><span className="badge party">{s.partyId}</span></td>
                    <td>
                      <span className={`badge ${getSLAClass(hours)}`}>
                        {hours}h {minutes}m
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-settle ${breach ? "active" : ""}`}
                        disabled={!breach}
                        onClick={() => handleSettle(s)}
                      >
                        Settle
                      </button>
                    </td>
                    <td>
                      <button className="btn-view" onClick={() => setSelectedSession(s)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ════ VIEW SESSION MODAL ════ */}
      {selectedSession && (
        <div className="modal" onClick={() => setSelectedSession(null)}>
          <div className="modal-content info-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header info-modal-header">
              <div className="settle-header-left">
                <span className="info-eyebrow">Session Record</span>
                <h3>Session Details</h3>
              </div>
              <button className="modal-x" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            <div className="settle-identity">
              <div className="settle-id-chip">
                <span className="chip-label">Booking ID</span>
                <span className="chip-mono">{selectedSession.bookingId}</span>
              </div>
              <div className="settle-id-chip">
                <span className="chip-label">Party</span>
                <span className="chip-mono">{selectedSession.partyId}</span>
              </div>
              <div className="settle-id-chip">
                <span className="chip-label">Status</span>
                <span className="chip-status">{selectedSession.status}</span>
              </div>
            </div>
            <div className="flat-grid-scroll">
              <div className="flat-section-label">
                All Fields <span className="flat-count">{flatSession.length}</span>
              </div>
              <div className="flat-cards-grid">
                {flatSession.map(([key, val]) => (
                  <FlatCard key={key} label={key} value={val} />
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setSelectedSession(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ SETTLEMENT MODAL ════ */}
      {settleSession && (
        <div className="modal" onClick={() => setSettleSession(null)}>
          <div className="modal-content settle-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header settle-modal-header">
              <div className="settle-header-left">
                <span className="settle-eyebrow">Force Settlement</span>
                <h3>Close Session</h3>
              </div>
              <button className="modal-x" onClick={() => setSettleSession(null)}>✕</button>
            </div>
            <div className="settle-identity">
              <div className="settle-id-chip">
                <span className="chip-label">Booking ID</span>
                <span className="chip-mono">{settleSession.bookingId}</span>
              </div>
              <div className="settle-id-chip">
                <span className="chip-label">Party</span>
                <span className="chip-mono">{settleSession.partyId}</span>
              </div>
              <div className="settle-id-chip">
                <span className="chip-label">Status</span>
                <span className="chip-status">{settleSession.status}</span>
              </div>
            </div>
            <div className="settle-warning-banner">
              <span className="settle-warning-icon">⚠</span>
              <span>This will forcefully close the session and push a CDR to the operator. This action cannot be undone.</span>
            </div>
            {flatPayload.length > 0 && (
              <div className="flat-grid-scroll">
                <div className="flat-section-label">
                  Settlement Payload <span className="flat-count">{flatPayload.length}</span>
                </div>
                <div className="flat-cards-grid">
                  {flatPayload.map(([key, val]) => (
                    <FlatCard key={key} label={key} value={val} />
                  ))}
                </div>
              </div>
            )}
            <div className="modal-footer settle-modal-footer">
              <button className="modal-close-btn" onClick={() => setSettleSession(null)}>Cancel</button>
              <button className="btn-settle-confirm" onClick={pushSettlement} disabled={pushing}>
                {pushing ? (
                  <><span className="btn-spinner" />Closing…</>
                ) : (
                  <><span className="btn-icon">⚡</span>Close Session</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}