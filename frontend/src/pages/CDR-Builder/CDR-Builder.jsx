import React, { useState, useRef } from "react";
import "./CDRBuilder.css";

const API_URL = import.meta.env.VITE_API_URL;

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);

export default function CDRBuilder() {
  const [bookingId, setBookingId] = useState("");
  const [payload, setPayload] = useState(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [token, setToken] = useState("");
  const [jsonError, setJsonError] = useState("");

  const textareaRef = useRef(null);

  const BUILD_URL = "https://api.chargezoneops.online/api/cdr-recovery/build";
  const POST_URL = "https://api.chargecloud.net/ocpi/emsp/2.2/cdrs";

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const fetchPayload = async () => {
    if (!bookingId.trim()) { alert("Enter Booking ID"); return; }
    setLoading(true); setError(""); setBookingStatus(""); setPayload(null); setIsEditing(false);
    try {
      const res = await fetch(`${BUILD_URL}/${bookingId}`);
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Session not found"); setLoading(false); return; }
      setBookingStatus(data.bookingStatus);
      setPayload(data.payload);
      setToken(data.token);
    } catch { setError("Backend not reachable"); }
    setLoading(false);
  };

  const startEdit = () => {
    setEditBuffer(JSON.stringify(payload, null, 2));
    setJsonError(""); setIsEditing(true);
    setTimeout(autoResize, 50);
  };
  const cancelEdit = () => { setIsEditing(false); setEditBuffer(""); setJsonError(""); };
  const saveEdit = () => {
    try {
      setPayload(JSON.parse(editBuffer));
      setIsEditing(false); setEditBuffer(""); setJsonError("");
    } catch { setJsonError("Invalid JSON — fix errors before saving."); }
  };

  const pushCDR = async () => {
    if (!payload) return;
    setPushing(true);
    try {
      const res = await fetch(POST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Token ${token}` },
        body: JSON.stringify(payload),
      });
      let result = {};
      try { result = await res.json(); } catch { }
      setLogs(prev => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        status: res.status,
        ok: res.ok,
        bookingId: payload.authorization_reference || bookingId,
        message: result?.status_message || result?.detail || (res.ok ? "CDR sent successfully" : "Push failed"),
        rawResponse: result,
      }, ...prev]);
    } catch { alert("POST Failed"); }
    setPushing(false);
  };

  const clearLogs = () => { setLogs([]); setExpandedLog(null); };
  const displayJson = JSON.stringify(payload, null, 2);
  const pillClass = `cdr-pill cdr-pill-${(bookingStatus || "default").toLowerCase()}`;

  return (
    <div className="cdr-page">
      <div className="cdr-inner">

        {/* Header */}
        <header className="cdr-page-header">
          <p className="cdr-eyebrow">EMSP · OCPI 2.2</p>
          <h1 className="cdr-title">CDR Builder</h1>
          <p className="cdr-subtitle">Build and push charge detail records to the EMSP endpoint</p>
        </header>

        {/* Booking lookup */}
        <div className="cdr-card">
          <p className="cdr-card-label">Booking Lookup</p>
          <div className="cdr-input-row">
            <input
              className="cdr-input"
              placeholder="Enter booking ID…"
              value={bookingId}
              onChange={e => setBookingId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchPayload()}
            />
            <button className="cdr-btn cdr-btn-blue" onClick={fetchPayload} disabled={loading}>
              {loading ? "Loading…" : <><IconSearch /> Preview</>}
            </button>
          </div>

          {bookingStatus && (
            <div className="cdr-status-row">
              <span className="cdr-status-label">Status</span>
              <span className={pillClass}>{bookingStatus}</span>
            </div>
          )}

          {error && <div className="cdr-error">⚠ {error}</div>}
        </div>

        {/* Payload viewer / editor */}
        {payload && (
          <div className="cdr-card">
            <div className="cdr-card-header-row">
              <p className="cdr-card-label">CDR Payload</p>
              <div className="cdr-action-group">
                {!isEditing ? (
                  <button className="cdr-btn cdr-btn-ghost" onClick={startEdit}>
                    <IconEdit /> Edit
                  </button>
                ) : (
                  <>
                    <button className="cdr-btn cdr-btn-ghost" onClick={cancelEdit}>Cancel</button>
                    <button className="cdr-btn cdr-btn-save" onClick={saveEdit}>Save changes</button>
                  </>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="cdr-json-viewer">
                <pre className="cdr-json-pre">{displayJson}</pre>
              </div>
            )}

            {isEditing && (
              <div className="cdr-editor-wrap">
                {jsonError && <div className="cdr-json-error">⚠ {jsonError}</div>}
                <textarea
                  ref={textareaRef}
                  className="cdr-textarea"
                  value={editBuffer}
                  onChange={e => { setEditBuffer(e.target.value); setJsonError(""); autoResize(); }}
                  spellCheck={false}
                />
              </div>
            )}

            {!isEditing && (
              <button className="cdr-btn cdr-btn-red cdr-btn-full" onClick={pushCDR} disabled={pushing}>
                {pushing ? "Pushing…" : <><IconSend /> Push CDR</>}
              </button>
            )}
          </div>
        )}

        {/* Push results */}
        {logs.length > 0 && (
          <div className="cdr-card">
            <div className="cdr-card-header-row">
              <p className="cdr-card-label">Push Results</p>
              <button className="cdr-btn cdr-btn-ghost" onClick={clearLogs}>
                <IconTrash /> Clear
              </button>
            </div>
            <div className="cdr-logs">
              {logs.map(log => (
                <div key={log.id} className={`cdr-log-row ${log.ok ? "cdr-log-ok" : "cdr-log-err"}`}>
                  <div className="cdr-log-main">
                    <span className={`cdr-http-badge ${log.ok ? "badge-ok" : "badge-err"}`}>{log.status}</span>
                    <span className="cdr-log-ref">{log.bookingId}</span>
                    <span className="cdr-log-msg">{log.message}</span>
                    <span className="cdr-log-time">{log.time}</span>
                    <button className="cdr-json-btn" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                      {expandedLog === log.id ? "Hide" : "JSON"}
                    </button>
                  </div>
                  {expandedLog === log.id && (
                    <pre className="cdr-log-raw">{JSON.stringify(log.rawResponse, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}