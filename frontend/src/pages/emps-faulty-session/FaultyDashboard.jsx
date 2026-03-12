import { useEffect, useState } from "react";
import axios from "axios";
import EVLoader from "../Dashboard/EVLoader";
import "./FaultySLA.css";

const BASE_URL = "http://localhost:5000/api/emsp-faulty-sessions";
const SETTLEMENT_PREVIEW = "http://localhost:5000/api/settlement/preview";
const SETTLEMENT_PUSH = "http://localhost:5000/api/settlement/push";

export default function FaultyDashboard() {

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // ── View modal state ──────────────────────────────────────────────────────
    const [viewSession, setViewSession] = useState(null);

    // ── Settle modal state ────────────────────────────────────────────────────
    const [settleSession, setSettleSession] = useState(null);
    const [payload, setPayload] = useState(null);
    const [token, setToken] = useState("");
    const [pushing, setPushing] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);

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

    /* SLA increasing from mailSentTime */
    const calculateSLA = (mailSentTime) => {
        if (!mailSentTime) return { hours: 0, minutes: 0 };
        const now = Date.now();
        const start = new Date(mailSentTime).getTime();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { hours, minutes };
    };

    const getSLAClass = (hours) => {
        if (hours >= 48) return "sla-breach";
        if (hours >= 24) return "sla-warning";
        return "sla-safe";
    };

    const isSettleable = (s) => {
        const { hours } = calculateSLA(s.mailSentTime);
        return hours >= 48;
    };

    // ── VIEW handler ──────────────────────────────────────────────────────────
    const handleView = (session) => {
        setViewSession(session);
    };

    const closeViewModal = () => {
        setViewSession(null);
    };

    // ── SETTLE handler ────────────────────────────────────────────────────────
    const handleSettle = async (session) => {
        setPreviewLoading(true);
        try {
            const res = await axios.get(`${SETTLEMENT_PREVIEW}/${session.bookingId}`);
            if (!res.data.success) {
                alert(res.data.error);
                return;
            }
            setPayload(res.data.payload);
            setToken(res.data.token);
            setSettleSession(session);
        } catch {
            alert("Failed to build settlement payload");
        } finally {
            setPreviewLoading(false);
        }
    };

    const closeSettleModal = () => {
        setSettleSession(null);
        setPayload(null);
        setToken("");
    };

    const pushSettlement = async () => {
        if (!payload) return;
        setPushing(true);
        try {
            const res = await axios.post(SETTLEMENT_PUSH, { payload, token });
            if (res.data.success) {
                alert("CDR pushed successfully");
                fetchData(); // refresh list after settlement
            } else {
                alert("Push failed");
            }
        } catch {
            alert("Settlement request failed");
        } finally {
            setPushing(false);
            closeSettleModal();
        }
    };

    /* Stats */
    const breach = sessions.filter(s => calculateSLA(s.mailSentTime).hours >= 48).length;
    const warning = sessions.filter(s => { const h = calculateSLA(s.mailSentTime).hours; return h >= 24 && h < 48; }).length;
    const safe = sessions.filter(s => calculateSLA(s.mailSentTime).hours < 24).length;

    return (
        <div className="faulty-page">

            {/* ── HEADER ───────────────────────────────────────────────────── */}
            <div className="page-header">
                <div>
                    <h1>EMSP Faulty Sessions</h1>
                    {lastUpdated && (
                        <span className="last-updated">
                            Live · {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                <div className="page-stats">
                    <div className="stat-pill breach">
                        <span>{breach}</span>
                        <small>Breach</small>
                    </div>
                    <div className="stat-pill warning">
                        <span>{warning}</span>
                        <small>Warning</small>
                    </div>
                    <div className="stat-pill safe">
                        <span>{safe}</span>
                        <small>On Track</small>
                    </div>
                    <div className="stat-pill total">
                        <span>{sessions.length}</span>
                        <small>Total</small>
                    </div>
                </div>
            </div>

            {/* ── TABLE ────────────────────────────────────────────────────── */}
            <div className="table-wrap">
                {loading ? (
                    <EVLoader message="Fetching faulty sessions..." />
                ) : (
                    <table className="sla-table">
                        <thead>
                            <tr>
                                <th>Booking ID</th>
                                <th>Faulty Reason</th>
                                <th>Party</th>
                                <th>SLA Duration</th>
                                <th>Settle</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => {
                                const { hours, minutes } = calculateSLA(s.mailSentTime);
                                const settleable = isSettleable(s);
                                return (
                                    <tr key={s.bookingId}>
                                        <td>
                                            <span className="mono">{s.bookingId}</span>
                                        </td>
                                        <td>
                                            <span className="badge faulty">{s.faultyReason}</span>
                                        </td>
                                        <td>
                                            <span className="badge party">{s.partyId}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getSLAClass(hours)}`}>
                                                {hours}h {minutes}m
                                            </span>
                                        </td>

                                        {/* SETTLE button — opens settlement confirmation modal */}
                                        <td>
                                            <button
                                                className={`btn-settle ${settleable ? "active" : ""}`}
                                                disabled={!settleable || previewLoading}
                                                onClick={() => handleSettle(s)}
                                                title={settleable ? "Force-settle this session" : "SLA threshold not reached"}
                                            >
                                                {previewLoading && settleSession?.bookingId === s.bookingId
                                                    ? "Loading…"
                                                    : "Settle"}
                                            </button>
                                        </td>

                                        {/* VIEW button — opens read-only detail modal */}
                                        <td>
                                            <button
                                                className="btn-view"
                                                onClick={() => handleView(s)}
                                                title="View session details"
                                            >
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

            {/* ── VIEW MODAL ───────────────────────────────────────────────── */}
            {viewSession && (
                <div className="modal" onClick={closeViewModal}>
                    <div className="modal-content modal-view" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>Session Details</h3>
                            <button className="modal-x" onClick={closeViewModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Booking ID</span>
                                    <span className="detail-value mono">{viewSession.bookingId}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Faulty Reason</span>
                                    <span className="detail-value">{viewSession.faultyReason}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Party</span>
                                    <span className="detail-value">
                                        <span className="badge party">{viewSession.partyId}</span>
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Mail Sent Time</span>
                                    <span className="detail-value">
                                        {viewSession.mailSentTime
                                            ? new Date(viewSession.mailSentTime).toLocaleString()
                                            : "—"}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">SLA Duration</span>
                                    <span className="detail-value">
                                        {(() => {
                                            const { hours, minutes } = calculateSLA(viewSession.mailSentTime);
                                            return (
                                                <span className={`badge ${getSLAClass(hours)}`}>
                                                    {hours}h {minutes}m
                                                </span>
                                            );
                                        })()}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">SLA Status</span>
                                    <span className="detail-value">
                                        {(() => {
                                            const h = calculateSLA(viewSession.mailSentTime).hours;
                                            if (h >= 48) return <span className="status-chip breach">Breach</span>;
                                            if (h >= 24) return <span className="status-chip warning">Warning</span>;
                                            return <span className="status-chip safe">On Track</span>;
                                        })()}
                                    </span>
                                </div>
                                {/* Render any extra fields from the session object */}
                                {Object.entries(viewSession)
                                    .filter(([k]) => !["bookingId", "faultyReason", "partyId", "mailSentTime"].includes(k))
                                    .map(([key, val]) => (
                                        <div className="detail-row" key={key}>
                                            <span className="detail-label">{key}</span>
                                            <span className="detail-value mono">
                                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="modal-close-btn" onClick={closeViewModal}>Close</button>
                        </div>

                    </div>
                </div>
            )}

            {/* ── SETTLE MODAL ─────────────────────────────────────────────── */}
            {settleSession && (
                <div className="modal" onClick={closeSettleModal}>
                    <div className="modal-content modal-settle" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>Force Settlement</h3>
                            <button className="modal-x" onClick={closeSettleModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            <p className="settle-warning">
                                ⚠️ You are about to force-close the following session. This action cannot be undone.
                            </p>
                            <div className="detail-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Booking ID</span>
                                    <span className="detail-value mono">{settleSession.bookingId}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Faulty Reason</span>
                                    <span className="detail-value">{settleSession.faultyReason}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Party</span>
                                    <span className="detail-value">
                                        <span className="badge party">{settleSession.partyId}</span>
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">SLA Duration</span>
                                    <span className="detail-value">
                                        {(() => {
                                            const { hours, minutes } = calculateSLA(settleSession.mailSentTime);
                                            return (
                                                <span className={`badge ${getSLAClass(hours)}`}>
                                                    {hours}h {minutes}m
                                                </span>
                                            );
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {payload && (
                                <details className="payload-preview">
                                    <summary>Preview CDR Payload</summary>
                                    <pre>{JSON.stringify(payload, null, 2)}</pre>
                                </details>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="modal-close-btn" onClick={closeSettleModal}>
                                Cancel
                            </button>
                            <button
                                className="btn-settle-confirm"
                                onClick={pushSettlement}
                                disabled={pushing}
                            >
                                {pushing ? "Closing…" : "Close Session"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}