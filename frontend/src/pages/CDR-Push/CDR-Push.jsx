import React, { useState } from "react";
import * as XLSX from "xlsx";
import "./CDRPush.css";

const API_BASE = "https://api.chargecloud.net/ocpi/cpo/2.2/multiplecdrs";

const PARTY_MAP = {
  TCZ: "62987db08f88870e6524d06a",
  GCM: "62fe0f0b55bf4908e67049c8",
  SMC: "632c4e573cad5ccb3be80436",
  MBI: "6350d68caf27764f2a7916c2",
  RIL: "639c1ffceb582e7d391ff166",
  SNP: "63dde74bc3ee259856a3a290",
  MNM: "644a02fb37447aeecfc99e28",
  EVT: "64771c143fb9cb6e9d1aa995",
  CZB: "64a64990d85d07463d192926",
  EVO: "64b0cbf02cc92b9c6e37eb36",
  PWH: "64cb2b2f87a860889d5ea40b",
  ARY: "64e03fbdd6fb6e61c87be04d",
  BEL: "64f16435f52fb17951f89570",
  AUD: "650ab695ac7d11268bcf0053",
  HYD: "651a784fcb136de388595ee1",
  ELS: "656d78bd7deb0cb4a02b5f2b",
  SAS: "667e7f1d77d24b1cacb06a4c",
  CZO: "66fb8f7482adfe956b0b7db9",
  GTR: "6772853c1ffaac41148fe06b",
  PWP: "67c800ec2cae681bfcd96834",
};

export default function CDRPushDashboard() {
  const [groups, setGroups] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [editableBody, setEditableBody] = useState("");
  const [statusTable, setStatusTable] = useState([]);
  const [responseBlob, setResponseBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  /* ================= EXCEL PARSER ================= */
  const handleExcelUpload = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      let partyGroups = {};

      if (wb.SheetNames.length > 1) {
        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          const ids = rows
            .map((r) => r["SESSION ID"] || r["booking_id"])
            .filter(Boolean);
          if (ids.length) partyGroups[sheetName] = ids;
        });
      } else {
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        rows.forEach((r) => {
          const party = r["PARTY ID"];
          const id = r["SESSION ID"] || r["booking_id"];
          if (!party || !id) return;
          if (!partyGroups[party]) partyGroups[party] = [];
          partyGroups[party].push(id);
        });
      }

      const table = Object.keys(partyGroups).map((p, i) => ({
        sr: i + 1,
        partyId: p,
        tenantId: PARTY_MAP[p],
        bookingIds: partyGroups[p],
        count: partyGroups[p].length,
      }));

      setGroups(table);
    };

    reader.readAsBinaryString(file);
  };

  /* ================= DRAG & DROP ================= */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelUpload(e.dataTransfer.files[0]);
    }
  };

  /* ================= SELECT PARTY ================= */
  const selectParty = (group) => {
    setSelectedParty(group);
    const body = JSON.stringify(
      group.bookingIds.map((id) => ({ booking_id: id })),
      null,
      2
    );
    setEditableBody(body);
    setStatusTable([]);
    setResponseBlob(null);
  };

  /* ================= PUSH ================= */
  const pushCDR = async () => {
    if (!selectedParty) return;

    try {
      setLoading(true);

      const url = `${API_BASE}/${selectedParty.tenantId}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: editableBody,
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      if (
        !contentType.includes("excel") &&
        !contentType.includes("sheet") &&
        !contentType.includes("octet-stream")
      ) {
        const text = await res.text();
        throw new Error("Response is not Excel:\n" + text);
      }

      const blob = await res.blob();
      setResponseBlob(blob);
      parseResponse(blob, selectedParty.bookingIds);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= PARSE RESPONSE ================= */
  const parseResponse = (blob, ids) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { range: 2 });

      const excelRows = rows.map((r) => ({
        booking_id: r.Booking_Id,
        status: r.Status,
      }));

      const table = ids.map((id, i) => {
        const match = excelRows.find((r) => r.booking_id === id);
        return {
          sr: i + 1,
          booking_id: id,
          status: match ? match.status : "No response",
        };
      });

      setStatusTable(table);
    };

    reader.readAsBinaryString(blob);
  };

  /* ================= DOWNLOAD ================= */
  const downloadResponse = () => {
    const exportData = statusTable.map((r) => ({
      "Sr No": r.sr,
      "Booking ID": r.booking_id,
      Status: r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CDR Status");
    XLSX.writeFile(wb, "CDR_Response.xlsx");
  };

  const getBadgeClass = (status) => {
    if (!status) return "badge badge-warning";
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("completed"))
      return "badge badge-success";
    if (lower.includes("error") || lower.includes("failed"))
      return "badge badge-error";
    return "badge badge-warning";
  };

  return (
    <div className="cdr-push-page">
      <div className="cdr-card">

        <h1 className="cdr-header">
          ⚡ CDR Push
        </h1>

        {/* Upload */}
        <div
          className={`upload-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <div>📊</div>
          <div className="upload-title">
            {groups.length > 0
              ? "File Uploaded Successfully!"
              : "Drop Excel file here or click to browse"}
          </div>
          <div className="upload-subtitle">
            Supports .xlsx format with Party ID and Session ID columns
          </div>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx"
            onChange={(e) =>
              e.target.files[0] && handleExcelUpload(e.target.files[0])
            }
            hidden
          />
        </div>

        {/* Party Table */}
        {groups.length > 0 && (
          <>
            <div className="table-wrapper">
              <table className="cdr-table">
                <thead>
                  <tr>
                    <th>Sr</th>
                    <th>Party ID</th>
                    <th>Sessions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.partyId}>
                      <td>{g.sr}</td>
                      <td><strong>{g.partyId}</strong></td>
                      <td>
                        <span className="badge badge-info">
                          {g.count} sessions
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-primary"
                          onClick={() => selectParty(g)}
                        >
                          {selectedParty?.partyId === g.partyId
                            ? "✓ Selected"
                            : "Select"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* API Preview */}
        {selectedParty && (
          <div className="preview-card">
            <div className="preview-title">🚀 API Configuration</div>

            <div className="api-url">
              {`${API_BASE}/${selectedParty.tenantId}`}
            </div>

            <textarea
              className="preview-textarea"
              rows={12}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
            />

            <button
              className="btn-primary"
              onClick={pushCDR}
              disabled={loading}
              style={{ width: "100%", marginTop: "15px" }}
            >
              {loading ? "⏳ Pushing..." : "🚀 Push CDR to API"}
            </button>
          </div>
        )}

        {/* Status Table */}
        {statusTable.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: "30px" }}>
            <table className="cdr-table">
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Booking ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {statusTable.map((r) => (
                  <tr key={r.sr}>
                    <td>{r.sr}</td>
                    <td><code>{r.booking_id}</code></td>
                    <td>
                      <span className={getBadgeClass(r.status)}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "15px" }}>
              <button className="btn-outline" onClick={downloadResponse}>
                📥 Download Excel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}