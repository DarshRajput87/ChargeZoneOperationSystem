import { useEffect, useState } from "react";
import axios from "axios";
import "./InProgressSLA.css";

const BASE_URL = "http://localhost:5000/api/emsp-in-progress";

// ── Recursive Field Renderer ──────────────────────────────────────────────────
function FieldRow({ label, value }) {
  const [open, setOpen] = useState(false);
  const isObject     = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray      = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const formatValue = (v) => {
    if (v === null)             return <span className="val-null">null</span>;
    if (typeof v === "boolean") return <span className="val-bool">{String(v)}</span>;
    if (typeof v === "number")  return <span className="val-number">{v}</span>;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v))
      return <span className="val-date">{new Date(v).toLocaleString()}</span>;
    return <span className="val-string">{v}</span>;
  };

  if (!isExpandable) {
    return (
      <div className="field-row">
        <span className="field-key">{label}</span>
        <span className="field-value">{formatValue(value)}</span>
      </div>
    );
  }

  const entries = isArray
    ? value.map((v, i) => [i, v])
    : Object.entries(value);

  return (
    <div className="field-group">
      <button className="field-group-header" onClick={() => setOpen(!open)}>
        <span className="field-key">{label}</span>
        <span className="field-group-meta">
          <span className="meta-count">
            {isArray ? `${entries.length} items` : `${entries.length} fields`}
          </span>
          <span className={`chevron ${open ? "open" : ""}`}>›</span>
        </span>
      </button>
      {open && (
        <div className="field-group-body">
          {entries.map(([k, v]) => (
            <FieldRow key={k} label={k} value={v} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InProgressDashboard() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const res = await axios.get(BASE_URL);
    setSessions(res.data.data);
  };

  const calculateSLA = (startTime) => {
    const now  = new Date();
    const diff = now - new Date(startTime);
    const hours   = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const getSLAClass = (hours) => {
    if (hours >= 48) return "sla-breach";
    if (hours >= 24) return "sla-warning";
    return "sla-safe";
  };

  return (
    <div className="sla-page">
      <h2>EMSP In-Progress SLA Monitor</h2>

      <table className="sla-table">
        <thead>
          <tr>
            <th>Booking</th><th>Status</th><th>Party</th>
            <th>SLA</th><th>Settle</th><th>View More</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const { hours, minutes } = calculateSLA(s.startTime);
            const breach = hours >= 48;
            return (
              <tr key={s._id}>
                <td className="mono">{s.bookingId}</td>
                <td><span className="badge status">{s.status}</span></td>
                <td><span className="badge party">{s.partyId}</span></td>
                <td>
                  <span className={`badge ${getSLAClass(hours)}`}>
                    {hours}h {minutes}m
                  </span>
                </td>
                <td>
                  <button className={`btn-settle ${breach ? "active" : ""}`} disabled={!breach}>
                    Settle
                  </button>
                </td>
                <td>
                  <button className="btn-view" onClick={() => setSelected(s)}>View</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3>Booking Details</h3>
              <button className="modal-x" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Quick-glance summary strip */}
            <div className="modal-summary">
              <div className="summary-chip">
                <span className="chip-label">Booking ID</span>
                <span className="chip-value mono">{selected.bookingId}</span>
              </div>
              <div className="summary-chip">
                <span className="chip-label">Status</span>
                <span className="badge status">{selected.status}</span>
              </div>
              <div className="summary-chip">
                <span className="chip-label">Party</span>
                <span className="badge party">{selected.partyId}</span>
              </div>
              <div className="summary-chip">
                <span className="chip-label">Payment</span>
                <span className={`badge ${selected.paymentStatus === "pending" ? "sla-warning" : "sla-safe"}`}>
                  {selected.paymentStatus}
                </span>
              </div>
            </div>

            {/* Accordion fields */}
            <div className="modal-fields">
              {Object.entries(selected).map(([key, val]) => (
                <FieldRow key={key} label={key} value={val} />
              ))}
            </div>

            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}