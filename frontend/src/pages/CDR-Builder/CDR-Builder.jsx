import React, { useState, useRef } from "react";
import "./CDRBuilder.css";

export default function CDRBuilder() {

  const [bookingId, setBookingId] = useState("");
  const [editablePayload, setEditablePayload] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);

  const textareaRef = useRef(null);

  const BUILD_URL = "http://localhost:5000/api/cdr-recovery/build";
  const POST_URL  = "https://api.chargecloud.net/ocpi/emsp/2.2/cdrs";

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  /* ================================
     FETCH PAYLOAD
  ================================= */
  const fetchPayload = async () => {

    if (!bookingId.trim()) {
      alert("Enter Booking ID");
      return;
    }

    setLoading(true);
    setError("");
    setBookingStatus("");

    try {

      const res = await fetch(`${BUILD_URL}/${bookingId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Session not found");
        setEditablePayload("");
        return;
      }

      setBookingStatus(data.bookingStatus);

      const formatted = JSON.stringify(data.payload, null, 2);
      setEditablePayload(formatted);

      setTimeout(autoResize, 50);

    } catch {
      setError("Backend not reachable");
    }

    setLoading(false);
  };

  /* ================================
     PUSH CDR
  ================================= */
  const pushCDR = async () => {

    let body;

    try {
      body = JSON.parse(editablePayload);
    } catch {
      alert("Invalid JSON payload");
      return;
    }

    try {

      setPushing(true);

      const res = await fetch(POST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      let result;
      try {
        result = await res.json();
      } catch {
        result = {};
      }

      setLogs(prev => [
        {
          time: new Date().toLocaleTimeString(),
          status: res.status,
          bookingId: body.authorization_reference,
          message:
            result?.status_message ||
            result?.detail ||
            (res.ok ? "CDR Sent Successfully" : "Failed")
        },
        ...prev
      ]);

    } catch {
      alert("POST Failed");
    }

    setPushing(false);
  };

  return (
    <div className="app-container">
      <div className="app-wrapper">

        <div className="app-header">
          <h1 className="app-title">CDR Builder</h1>
          <p className="app-subtitle">
            Build and push OCPI charge detail records
          </p>
        </div>

        <div className="card">
          <h2 className="card-title">📋 Booking Details</h2>

          <div className="input-group">
            <input
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="input-field"
            />

            <button
              onClick={fetchPayload}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Loading..." : "Preview"}
            </button>
          </div>

          {/* Booking Status */}
          {bookingStatus && (
            <div className="booking-status">
              Status:
              <span className={`status-pill ${bookingStatus}`}>
                {bookingStatus}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-box">
              ❌ {error}
            </div>
          )}
        </div>

        {editablePayload && (
          <div className="card">
            <h2 className="card-title">✏️ Editable Payload</h2>

            <textarea
              ref={textareaRef}
              value={editablePayload}
              onChange={(e) => {
                setEditablePayload(e.target.value);
                autoResize();
              }}
              className="textarea-field"
            />

            <button
              onClick={pushCDR}
              disabled={pushing}
              className="btn btn-primary btn-block"
            >
              {pushing ? "Pushing..." : "🚀 Push CDR"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}