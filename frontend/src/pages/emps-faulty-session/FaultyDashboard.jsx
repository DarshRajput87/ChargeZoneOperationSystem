import { useEffect, useState } from "react";
import API from "../../services/api";
import EVLoader from "../Dashboard/EVLoader";
import "./FaultySLA.css";

const BASE_URL = "/emsp-faulty-sessions";
const FAULTY_PREVIEW = `${BASE_URL}/preview`;
const FAULTY_PUSH = `${BASE_URL}/push`;

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
const calcSLAHours = (mailSentTime) => {
    if (!mailSentTime) return 0;
    return Math.floor((Date.now() - new Date(mailSentTime).getTime()) / 3_600_000);
};

// ─────────────────────────────────────────────────────────────────────────────
// MethodSelectionModal
// ─────────────────────────────────────────────────────────────────────────────
function MethodSelectionModal({ session, sessions, onSelect, onClose }) {
    const [hovered, setHovered] = useState(null);

    const tenantshow = session?.tenantId;
    const tenant = session?.tenant;
    const party = session?.partyId;

    const breachedSiblings = sessions?.filter(
        s => s.tenant === tenant &&
            s.partyId === party &&
            s.bookingId !== session.bookingId &&
            calcSLAHours(s.mailSentTime) >= 48
    ) ?? [];

    const singleBookings = [session.bookingId];
    const multiBookings = [session.bookingId, ...breachedSiblings.map(s => s.bookingId)];
    const canMulti = breachedSiblings.length > 0;

    return (
        <div className="fsla-modal" onClick={onClose}>
            <div
                className="fsla-modal-content fsla-method-select-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: "540px",
                    background: "#0b1520",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px",
                    overflow: "hidden"
                }}
            >
                {/* HEADER */}
                <div
                    className="fsla-modal-header"
                    style={{
                        background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, transparent 55%)",
                        borderBottom: "1px solid rgba(239,68,68,0.1)",
                        padding: "22px 26px 20px"
                    }}
                >
                    <div className="fsla-settle-header-left">
                        <span className="fsla-settle-eyebrow">Faulty Settlement</span>
                        <h3 style={{ fontSize: "17px", fontWeight: 600 }}>Choose Push Method</h3>
                    </div>
                    <button className="fsla-modal-x" onClick={onClose}>✕</button>
                </div>

                {/* SESSION INFO STRIP */}
                <div className="fsla-settle-identity">
                    <div className="fsla-id-chip">
                        <span className="fsla-chip-label">Tenant</span>
                        <span className="fsla-chip-mono">{tenantshow ?? "—"}</span>
                    </div>
                    <div className="fsla-id-chip">
                        <span className="fsla-chip-label">Party</span>
                        <span className="fsla-chip-mono">{party}</span>
                    </div>
                    <div className="fsla-id-chip">
                        <span className="fsla-chip-label">Breached (same party)</span>
                        <span className="fsla-chip-mono" style={{ color: canMulti ? "var(--red)" : "var(--text-muted)" }}>
                            {multiBookings.length}
                        </span>
                    </div>
                </div>

                {/* METHOD CARDS */}
                <div style={{ padding: "18px 22px 6px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                        {/* SINGLE PUSH */}
                        <button
                            className="fsla-method-card"
                            onMouseEnter={() => setHovered("single")}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => onSelect({ method: "script", bookings: singleBookings })}
                        >
                            <div className="fsla-method-icon">⚡</div>
                            <div className="fsla-method-content">
                                <div className="fsla-method-title">Single Push</div>
                                <div className="fsla-method-desc">
                                    Push only this session —&nbsp;
                                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-secondary)" }}>
                                        {session.bookingId}
                                    </span>
                                </div>
                            </div>
                            <div className="fsla-method-badge-count" style={{
                                background: "rgba(239,68,68,0.12)",
                                color: "var(--red)",
                                border: "1px solid rgba(239,68,68,0.25)"
                            }}>1</div>
                            <div className="fsla-method-arrow">→</div>
                        </button>

                        {/* MULTI PUSH */}
                        <button
                            className={`fsla-method-card multi ${!canMulti ? "fsla-method-card-disabled" : ""}`}
                            onMouseEnter={() => canMulti && setHovered("multi")}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => canMulti && onSelect({ method: "script", bookings: multiBookings })}
                            disabled={!canMulti}
                            title={!canMulti ? "No other SLA-breached sessions found for this tenant & party" : ""}
                        >
                            <div className="fsla-method-icon">🚀</div>
                            <div className="fsla-method-content">
                                <div className="fsla-method-title">
                                    Multi Push
                                    {!canMulti && (
                                        <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px" }}>
                                            (no other breached)
                                        </span>
                                    )}
                                </div>
                                <div className="fsla-method-desc">
                                    {canMulti
                                        ? `Push all ${multiBookings.length} SLA-breached sessions for this tenant & party`
                                        : "No additional SLA-breached sessions share this tenant & party"}
                                </div>
                            </div>
                            <div className="fsla-method-badge-count" style={{
                                background: canMulti ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                                color: canMulti ? "var(--green)" : "var(--text-muted)",
                                border: canMulti ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.08)"
                            }}>{multiBookings.length}</div>
                            <div className="fsla-method-arrow">→</div>
                        </button>

                    </div>
                </div>

                {/* MULTI BOOKING ID PREVIEW */}
                {canMulti && (
                    <div style={{ padding: "14px 22px 6px" }}>
                        <div style={{
                            fontSize: "10.5px", color: "var(--text-muted)", marginBottom: "7px",
                            letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600
                        }}>
                            IDs included in Multi Push
                        </div>
                        <div style={{
                            background: "rgba(255,255,255,0.025)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "10px",
                            padding: "10px 12px",
                            maxHeight: "120px",
                            overflowY: "auto",
                            scrollbarWidth: "thin",
                            scrollbarColor: "#1e3248 transparent"
                        }}>
                            {multiBookings.map((id, i) => (
                                <div key={id} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontFamily: "monospace",
                                    fontSize: "11.5px",
                                    color: i === 0 ? "#7eb8f7" : "var(--red)",
                                    padding: "3px 0",
                                    borderBottom: i < multiBookings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"
                                }}>
                                    <span style={{
                                        fontSize: "9px", fontFamily: "var(--font)", fontWeight: 600,
                                        letterSpacing: "0.06em", minWidth: "46px",
                                        color: i === 0 ? "rgba(126,184,247,0.6)" : "rgba(239,68,68,0.6)"
                                    }}>
                                        {i === 0 ? "CURRENT" : "BREACH"}
                                    </span>
                                    {id}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FOOTER */}
                <div className="fsla-modal-footer" style={{ padding: "16px 22px" }}>
                    <button className="fsla-modal-close-btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function FaultyDashboard() {

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // View modal
    const [viewSession, setViewSession] = useState(null);

    // Method selection modal (first step of settle flow)
    const [methodSession, setMethodSession] = useState(null);

    // Settle modal (second step — CDR / Script)
    const [settleSession, setSettleSession] = useState(null);
    const [settleMethod, setSettleMethod] = useState(null);  // "cdr" | "script"
    const [settleBookings, setSettleBookings] = useState([]);
    const [payload, setPayload] = useState(null);
    const [token, setToken] = useState("");
    const [pushing, setPushing] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [faultyPreviews, setFaultyPreviews] = useState([]); // Array of {url, payload, tenantId}

    // Filters
    const [searchBookingId, setSearchBookingId] = useState("");
    const [selectedParty, setSelectedParty] = useState("all");

    // Pagination
    const limit = 10;
    const [cursorHistory, setCursorHistory] = useState([null]);
    const [currentPage, setCurrentPage] = useState(0);
    const [nextCursor, setNextCursor] = useState(null);
    const [totalCount, setTotalCount] = useState(0); // real total from DB

    useEffect(() => {
        const currentCursor = cursorHistory[currentPage];
        fetchData(currentCursor);
        const interval = setInterval(() => fetchData(currentCursor), 60000);
        return () => clearInterval(interval);
    }, [currentPage, cursorHistory]);

    const fetchData = async (cursor) => {
        setLoading(true);
        try {
            const res = await API.get(BASE_URL, { params: { cursor, limit } });
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
        setCursorHistory(prev => {
            const newHistory = [...prev];
            newHistory[currentPage + 1] = nextCursor;
            return newHistory;
        });
        setCurrentPage(p => p + 1);
    };

    const goPrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(p => p - 1);
        }
    };

    const calculateSLA = (mailSentTime) => {
        if (!mailSentTime) return { hours: 0, minutes: 0 };
        const diff = Date.now() - new Date(mailSentTime).getTime();
        return {
            hours: Math.floor(diff / 3_600_000),
            minutes: Math.floor((diff % 3_600_000) / 60_000)
        };
    };

    const getSLAClass = (hours) => {
        if (hours >= 48) return "fsla-badge fsla-sla-breach";
        if (hours >= 24) return "fsla-badge fsla-sla-warning";
        return "fsla-badge fsla-sla-safe";
    };

    const isSettleable = (s) => calculateSLA(s.mailSentTime).hours >= 48;

    const handleView = (s) => setViewSession(s);
    const closeViewModal = () => setViewSession(null);

    const handleSettle = (s) => setMethodSession(s);
    const closeMethodModal = () => setMethodSession(null);

    const handleMethodSelect = async ({ method, bookings }) => {
        closeMethodModal();

        if (method === "cdr") {
            setPreviewLoading(true);
            try {
                const res = await API.get(`${SETTLEMENT_PREVIEW}/${bookings[0]}`);
                if (!res.data.success) { alert(res.data.error); return; }
                setPayload(res.data.payload);
                setToken(res.data.token);
                setSettleMethod("cdr");
                setSettleBookings(bookings);
                setSettleSession(methodSession ?? sessions.find(s => s.bookingId === bookings[0]));
            } catch {
                alert("Failed to build settlement payload");
            } finally {
                setPreviewLoading(false);
            }
        } else {
            setPreviewLoading(true);
            try {
                const res = await API.post(FAULTY_PREVIEW, { bookingIds: bookings });
                if (!res.data.success) { alert(res.data.error); return; }

                setFaultyPreviews(res.data.previews);
                setPayload(null);
                setToken("");
                setSettleMethod("script");
                setSettleBookings(bookings);
                setSettleSession(methodSession ?? sessions.find(s => s.bookingId === bookings[0]));
            } catch (err) {
                alert("Failed to build faulty session preview: " + (err.response?.data?.error || err.message));
            } finally {
                setPreviewLoading(false);
            }
        }
    };

    const closeSettleModal = () => {
        setSettleSession(null);
        setPayload(null);
        setToken("");
        setSettleMethod(null);
        setSettleBookings([]);
        setFaultyPreviews([]);
    };

    const pushSettlement = async () => {
        setPushing(true);
        try {
            if (settleMethod === "cdr") {
                const res = await API.post(SETTLEMENT_PUSH, { payload, token });
                if (res.data.success) { alert("CDR pushed successfully"); fetchData(); }
                else alert("Push failed");
            } else {
                const res = await API.post(FAULTY_PUSH, { bookingIds: settleBookings });
                if (res.data.success) {
                    alert("Faulty sessions pushed successfully");
                    fetchData();
                } else {
                    alert("Push failed: " + (res.data.error || "Unknown error"));
                }
            }
        } catch (err) {
            alert("Settlement request failed: " + (err.response?.data?.error || err.message));
        } finally {
            setPushing(false);
            closeSettleModal();
        }
    };

    // ── Derived: unique party list for dropdown ──────────────────────────────
    const partyOptions = ["all", ...Array.from(new Set(sessions.map(s => s.partyId).filter(Boolean))).sort()];

    // ── Derived: filtered sessions ───────────────────────────────────────────
    const filteredSessions = sessions.filter(s => {
        const matchesBooking = searchBookingId.trim() === "" ||
            s.bookingId?.toLowerCase().includes(searchBookingId.trim().toLowerCase());
        const matchesParty = selectedParty === "all" || s.partyId === selectedParty;
        return matchesBooking && matchesParty;
    });

    const breach = sessions.filter(s => calculateSLA(s.mailSentTime).hours >= 48).length;
    const warning = sessions.filter(s => { const h = calculateSLA(s.mailSentTime).hours; return h >= 24 && h < 48; }).length;
    const safe = sessions.filter(s => calculateSLA(s.mailSentTime).hours < 24).length;

    // Only show pagination controls when we're not on the first page or there's more data to fetch
    const showPagination = currentPage > 0 || (!!nextCursor && sessions.length === limit);

    return (
        <div className="fsla-page">

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="fsla-page-header">
                <div>
                    <div className="fsla-title-row">
                        <div className="fsla-title-icon">
                            <svg className="fsla-title-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <h1 className="fsla-page-title">Faulty Sessions</h1>
                        {lastUpdated && (
                            <span className="fsla-last-updated">
                                <span className="fsla-live-dot" />
                                {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <p className="fsla-page-subtitle">Monitor and force-settle EMSP sessions that have exceeded SLA thresholds</p>
                </div>

                <div className="fsla-stats">
                    <div className="fsla-stat-pill breach">
                        <span className="fsla-stat-num">{breach}</span>
                        <span className="fsla-stat-label">Breach</span>
                    </div>
                    <div className="fsla-stat-divider" />
                    <div className="fsla-stat-pill warning">
                        <span className="fsla-stat-num">{warning}</span>
                        <span className="fsla-stat-label">Warning</span>
                    </div>
                    <div className="fsla-stat-divider" />
                    <div className="fsla-stat-pill safe">
                        <span className="fsla-stat-num">{safe}</span>
                        <span className="fsla-stat-label">On Track</span>
                    </div>
                    <div className="fsla-stat-divider" />
                    <div className="fsla-stat-pill total">
                        <span className="fsla-stat-num">{totalCount}</span>
                        <span className="fsla-stat-label">Total</span>
                    </div>
                </div>
            </div>

            {/* ── FILTERS ────────────────────────────────────────────────── */}
            <div style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginBottom: "14px",
                flexWrap: "wrap"
            }}>
                {/* Search by Booking ID */}
                <div style={{ position: "relative", flex: "1 1 220px", maxWidth: "340px" }}>
                    <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{
                            position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)",
                            width: "15px", height: "15px", color: "var(--text-muted)", pointerEvents: "none"
                        }}
                    >
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search booking ID…"
                        value={searchBookingId}
                        onChange={e => setSearchBookingId(e.target.value)}
                        style={{
                            width: "100%",
                            paddingLeft: "34px",
                            paddingRight: "12px",
                            paddingTop: "8px",
                            paddingBottom: "8px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "13px",
                            outline: "none",
                            transition: "border-color 0.2s",
                            boxSizing: "border-box"
                        }}
                        onFocus={e => e.target.style.borderColor = "rgba(126,184,247,0.5)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                </div>

                {/* Party dropdown */}
                <div style={{ position: "relative" }}>
                    <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{
                            position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)",
                            width: "14px", height: "14px", color: "var(--text-muted)", pointerEvents: "none"
                        }}
                    >
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <select
                        value={selectedParty}
                        onChange={e => setSelectedParty(e.target.value)}
                        style={{
                            paddingLeft: "32px",
                            paddingRight: "28px",
                            paddingTop: "8px",
                            paddingBottom: "8px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: selectedParty === "all" ? "var(--text-muted)" : "#fff",
                            fontSize: "13px",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            minWidth: "160px"
                        }}
                    >
                        {partyOptions.map(p => (
                            <option key={p} value={p} style={{ background: "#0b1520" }}>
                                {p === "all" ? "All Parties" : p}
                            </option>
                        ))}
                    </select>
                    {/* chevron */}
                    <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{
                            position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)",
                            width: "12px", height: "12px", color: "var(--text-muted)", pointerEvents: "none"
                        }}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>

                {/* Active filter indicator */}
                {(searchBookingId || selectedParty !== "all") && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--text-muted)"
                    }}>
                        <span>
                            Showing <strong style={{ color: "#7eb8f7" }}>{filteredSessions.length}</strong> of {sessions.length}
                        </span>
                        <button
                            onClick={() => { setSearchBookingId(""); setSelectedParty("all"); }}
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "5px",
                                color: "var(--text-muted)",
                                fontSize: "11px",
                                padding: "2px 8px",
                                cursor: "pointer"
                            }}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* ── TABLE ──────────────────────────────────────────────────── */}
            <div className="fsla-table-wrap">
                {loading ? (
                    <EVLoader message="Fetching faulty sessions..." />
                ) : filteredSessions.length === 0 ? (
                    <div className="fsla-empty-state">
                        <div className="fsla-empty-icon">{sessions.length === 0 ? "✅" : "🔍"}</div>
                        <div className="fsla-empty-title">
                            {sessions.length === 0 ? "No faulty sessions" : "No matching sessions"}
                        </div>
                        <div className="fsla-empty-sub">
                            {sessions.length === 0
                                ? "All sessions are operating within SLA parameters"
                                : "Try adjusting your search or filter criteria"}
                        </div>
                    </div>
                ) : (
                    <table className="fsla-table">
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
                            {filteredSessions.map(s => {
                                const { hours, minutes } = calculateSLA(s.mailSentTime);
                                const settleable = isSettleable(s);
                                return (
                                    <tr key={s.bookingId}>
                                        <td><span className="fsla-mono">{s.bookingId}</span></td>
                                        <td><span className="fsla-badge status-other">{s.faultyReason}</span></td>
                                        <td><span className="fsla-badge party">{s.partyId}</span></td>
                                        <td>
                                            <span className={getSLAClass(hours)}>
                                                {hours}h {minutes}m
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`fsla-btn-settle ${settleable ? "active" : ""}`}
                                                disabled={!settleable || previewLoading}
                                                onClick={() => handleSettle(s)}
                                                title={settleable ? "Force-settle this session" : "SLA threshold not reached"}
                                            >
                                                {previewLoading ? "Loading…" : "Settle"}
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className="fsla-btn-view"
                                                onClick={() => handleView(s)}
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

                {/* Pagination — only rendered when the current page has 10 rows */}
                {/* Pagination */}
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
                                {Math.ceil(totalCount / limit)} pages
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
                                className="fsla-pag-btn"
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

                            {/* Page dots */}
                            <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "0 4px" }}>
                                {Array.from({ length: Math.min(5, Math.ceil(totalCount / limit)) }, (_, i) => {
                                    const totalPages = Math.ceil(totalCount / limit);
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
                                className="fsla-pag-btn fsla-pag-btn-next"
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


            {/* ── STEP 1: METHOD SELECTION MODAL ─────────────────────────── */}
            {methodSession && (
                <MethodSelectionModal
                    session={methodSession}
                    sessions={sessions}
                    onSelect={handleMethodSelect}
                    onClose={closeMethodModal}
                />
            )}


            {/* ── STEP 2: SETTLE CONFIRMATION MODAL ──────────────────────── */}
            {settleSession && (
                <div className="fsla-modal" onClick={closeSettleModal}>
                    <div className="fsla-modal-content fsla-modal-settle" onClick={e => e.stopPropagation()}>

                        <div className="fsla-modal-header fsla-settle-modal-header">
                            <div className="fsla-settle-header-left">
                                <span className="fsla-settle-eyebrow">
                                    {settleMethod === "cdr" ? "CDR Builder" : "Script Push"}
                                </span>
                                <h3>Force Settlement</h3>
                            </div>
                            <button className="fsla-modal-x" onClick={closeSettleModal}>✕</button>
                        </div>

                        <div className="fsla-settle-identity">
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">Booking{settleBookings.length > 1 ? "s" : ""}</span>
                                <span className="fsla-chip-mono">{settleBookings.length}</span>
                            </div>
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">Party</span>
                                <span className="fsla-chip-mono">{settleSession.partyId}</span>
                            </div>
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">Method</span>
                                <span className="fsla-chip-mono" style={{ color: settleMethod === "cdr" ? "#7eb8f7" : "#4ade80" }}>
                                    {settleMethod === "cdr" ? "CDR Builder" : "Script Push"}
                                </span>
                            </div>
                        </div>

                        <div className="fsla-modal-body">
                            <div className="fsla-warning-banner">
                                <span className="fsla-warning-icon">⚠️</span>
                                <span>
                                    You are about to force-close{" "}
                                    {settleBookings.length > 1
                                        ? `${settleBookings.length} sessions`
                                        : "this session"}.
                                    This action <strong>cannot be undone</strong>.
                                </span>
                            </div>

                            <div className="fsla-detail-grid" style={{ marginTop: "16px" }}>
                                <div className="fsla-detail-row">
                                    <span className="fsla-detail-label">Booking ID(s)</span>
                                    <span className="fsla-detail-value fsla-mono" style={{ fontSize: "11.5px", lineHeight: 1.7 }}>
                                        {settleBookings.join(", ")}
                                    </span>
                                </div>
                                <div className="fsla-detail-row">
                                    <span className="fsla-detail-label">Faulty Reason</span>
                                    <span className="fsla-detail-value">{settleSession.faultyReason}</span>
                                </div>
                                <div className="fsla-detail-row">
                                    <span className="fsla-detail-label">Tenant</span>
                                    <span className="fsla-detail-value">
                                        <span className="fsla-badge party">{settleSession.tenantId}</span>
                                    </span>
                                </div>
                                <div className="fsla-detail-row">
                                    <span className="fsla-detail-label">SLA Duration</span>
                                    <span className="fsla-detail-value">
                                        {(() => {
                                            const { hours, minutes } = calculateSLA(settleSession.mailSentTime);
                                            return (
                                                <span className={getSLAClass(hours)}>
                                                    {hours}h {minutes}m
                                                </span>
                                            );
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {payload && (
                                <details className="fsla-payload-preview">
                                    <summary>Preview CDR Payload</summary>
                                    <pre>{JSON.stringify(payload, null, 2)}</pre>
                                </details>
                            )}

                            {faultyPreviews.length > 0 && (
                                <div className="fsla-faulty-preview-container" style={{ marginTop: "16px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        ChargeCloud API Preview
                                    </div>
                                    {faultyPreviews.map((p, idx) => (
                                        <div key={idx} className="fsla-preview-item" style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "10px" }}>
                                            <div style={{ fontSize: "10px", color: "#7eb8f7", marginBottom: "6px", fontFamily: "monospace", display: "flex", gap: "6px" }}>
                                                <span style={{ color: "var(--green)", fontWeight: 700 }}>POST</span>
                                                <span style={{ opacity: 0.8, wordBreak: "break-all" }}>{p.url}</span>
                                            </div>
                                            <details className="fsla-payload-preview" style={{ border: "none", background: "none", padding: 0 }}>
                                                <summary style={{ fontSize: "11px", color: "var(--text-muted)", padding: 0 }}>
                                                    View Push Payload ({p.sessionCount} session{p.sessionCount > 1 ? "s" : ""})
                                                </summary>
                                                <pre style={{ fontSize: "10px", marginTop: "8px", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                                                    {JSON.stringify(p.payload, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="fsla-modal-footer settle">
                            <button className="fsla-modal-close-btn" onClick={closeSettleModal}>Cancel</button>
                            <button
                                className="fsla-btn-settle-confirm"
                                onClick={pushSettlement}
                                disabled={pushing}
                            >
                                {pushing
                                    ? <><span className="fsla-btn-spinner" /> Pushing…</>
                                    : <><span className="fsla-btn-icon">⚡</span> Confirm &amp; Push</>
                                }
                            </button>
                        </div>

                    </div>
                </div>
            )}


            {/* ── VIEW MODAL ──────────────────────────────────────────────── */}
            {viewSession && (
                <div className="fsla-modal" onClick={closeViewModal}>
                    <div
                        className="fsla-modal-content fsla-modal-view"
                        onClick={e => e.stopPropagation()}
                        style={{ width: "660px" }}
                    >
                        <div className="fsla-modal-header fsla-info-modal-header">
                            <div className="fsla-settle-header-left">
                                <span className="fsla-info-eyebrow">Session Details</span>
                                <h3 style={{ fontSize: "17px", fontWeight: 600 }}>
                                    {viewSession.bookingId}
                                </h3>
                            </div>
                            <button className="fsla-modal-x" onClick={closeViewModal}>✕</button>
                        </div>

                        <div className="fsla-settle-identity">
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">Party</span>
                                <span className="fsla-chip-mono">{viewSession.partyId}</span>
                            </div>
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">SLA Status</span>
                                <span className="fsla-chip-status">
                                    {(() => {
                                        const h = calculateSLA(viewSession.mailSentTime).hours;
                                        if (h >= 48) return <span className="fsla-status-chip breach">Breach</span>;
                                        if (h >= 24) return <span className="fsla-status-chip warning">Warning</span>;
                                        return <span className="fsla-status-chip safe">On Track</span>;
                                    })()}
                                </span>
                            </div>
                            <div className="fsla-id-chip">
                                <span className="fsla-chip-label">SLA Elapsed</span>
                                <span className="fsla-chip-mono">
                                    {(() => {
                                        const { hours, minutes } = calculateSLA(viewSession.mailSentTime);
                                        return `${hours}h ${minutes}m`;
                                    })()}
                                </span>
                            </div>
                        </div>

                        <div className="fsla-flat-grid-scroll">

                            <div className="fsla-flat-section-label" style={{ marginBottom: "10px" }}>
                                Core Info
                                <span className="fsla-flat-count">4</span>
                            </div>
                            <div className="fsla-cards-grid" style={{ marginBottom: "20px" }}>
                                {[
                                    { label: "Booking ID", value: viewSession.bookingId, type: "hash" },
                                    { label: "Faulty Reason", value: viewSession.faultyReason, type: "string" },
                                    { label: "Party ID", value: viewSession.partyId, type: "string" },
                                    {
                                        label: "Mail Sent",
                                        value: viewSession.mailSentTime
                                            ? new Date(viewSession.mailSentTime).toLocaleString()
                                            : "—",
                                        type: "date"
                                    }
                                ].map(({ label, value, type }) => (
                                    <div className="fsla-flat-card" key={label}>
                                        <span className="fsla-flat-card-label">{label}</span>
                                        <span className={`fsla-flat-card-value fsla-sv-${type}`}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {(() => {
                                const coreKeys = ["bookingId", "faultyReason", "partyId", "mailSentTime"];
                                const extras = Object.entries(viewSession).filter(([k]) => !coreKeys.includes(k));
                                if (!extras.length) return null;
                                return (
                                    <>
                                        <div className="fsla-flat-section-label" style={{ marginBottom: "10px" }}>
                                            Additional Fields
                                            <span className="fsla-flat-count">{extras.length}</span>
                                        </div>
                                        <div className="fsla-cards-grid">
                                            {extras.map(([key, val]) => {
                                                const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
                                                const type =
                                                    typeof val === "boolean" ? "bool"
                                                        : typeof val === "number" ? "number"
                                                            : strVal.length > 30 ? "hash"
                                                                : "string";
                                                return (
                                                    <div className="fsla-flat-card" key={key}>
                                                        <span className="fsla-flat-card-label">{key}</span>
                                                        <span className={`fsla-flat-card-value fsla-sv-${type}`}>{strVal}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="fsla-modal-footer">
                            {isSettleable(viewSession) && (
                                <button
                                    className="fsla-btn-settle-confirm"
                                    style={{ marginRight: "auto" }}
                                    onClick={() => { closeViewModal(); handleSettle(viewSession); }}
                                >
                                    <span className="fsla-btn-icon">⚡</span> Settle Session
                                </button>
                            )}
                            <button className="fsla-modal-close-btn" onClick={closeViewModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}