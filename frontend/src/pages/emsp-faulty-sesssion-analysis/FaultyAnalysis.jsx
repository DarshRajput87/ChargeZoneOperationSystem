import { useEffect, useState, useRef } from "react";
import { getTenants, getOcpiClients, getExistingFleets, createFleet } from "../../services/fleetService";
import * as XLSX from "xlsx";
import "./FleetForm.css";

/* ══════════════════════════════════
   SEARCH DROPDOWN
══════════════════════════════════ */
function SearchDropdown({ options, value, onChange, placeholder, disabled }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const inputRef = useRef(null);

    const selected = options.find((o) => o.value === value) || null;

    const filtered = query.trim()
        ? options.filter(
            (o) =>
                o.label.toLowerCase().includes(query.toLowerCase()) ||
                (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
        )
        : options;

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleFocus = () => { setOpen(true); setQuery(""); };
    const handleSelect = (opt) => { onChange(opt.value); setQuery(""); setOpen(false); };
    const handleClear = (e) => { e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); };

    const displayValue = open ? query : selected ? selected.label : "";

    return (
        <div className={`sdd ${open ? "sdd--open" : ""} ${disabled ? "sdd--disabled" : ""}`} ref={ref}>
            <div className="sdd__wrap" onClick={() => !disabled && inputRef.current?.focus()}>
                <svg className="sdd__icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                    ref={inputRef}
                    className="sdd__input"
                    placeholder={selected && !open ? selected.label : placeholder}
                    value={displayValue}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={handleFocus}
                    disabled={disabled}
                    readOnly={false}
                />
                {selected && !open && (
                    <button className="sdd__clear" onClick={handleClear} title="Clear">
                        <svg viewBox="0 0 12 12" fill="none">
                            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                )}
                <span className={`sdd__chevron ${open ? "sdd__chevron--up" : ""}`}>
                    <svg viewBox="0 0 12 8" fill="none">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>

            {open && (
                <div className="sdd__panel">
                    <ul className="sdd__list">
                        {filtered.length > 0 ? (
                            filtered.map((opt) => (
                                <li
                                    key={opt.value}
                                    className={`sdd__item ${opt.value === value ? "sdd__item--active" : ""}`}
                                    onMouseDown={() => handleSelect(opt)}
                                >
                                    <span className="sdd__item-label">{opt.label}</span>
                                    {opt.sub && <span className="sdd__item-sub">{opt.sub}</span>}
                                    {opt.value === value && (
                                        <span className="sdd__item-check">
                                            <svg viewBox="0 0 14 14" fill="none">
                                                <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li className="sdd__empty">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                No results for "{query}"
                            </li>
                        )}
                    </ul>
                    {filtered.length > 0 && (
                        <div className="sdd__footer">
                            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════
   PAYLOAD PREVIEW MODAL
══════════════════════════════════ */
function PayloadModal({ payload, onClose, onConfirm }) {
    const [view, setView] = useState("table"); // "table" | "json"
    const [editingCell, setEditingCell] = useState(null); // { row, key }
    const [data, setData] = useState(() => JSON.parse(JSON.stringify(payload)));
    const [jsonText, setJsonText] = useState(() => JSON.stringify(payload, null, 2));
    const [jsonError, setJsonError] = useState(null);

    const fleets = data.fleets || [];

    const COLS = [
        { key: "initiator_name", label: "Initiator Name" },
        { key: "price_per_unit", label: "Price / Unit" },
        { key: "ocpiCredential", label: "OCPI Credential" },
        { key: "initiated_by", label: "Initiated By" },
    ];

    const handleCellEdit = (row, key, val) => {
        const updated = { ...data };
        updated.fleets[row][key] = val;
        setData(updated);
        setJsonText(JSON.stringify(updated, null, 2));
    };

    const handleJsonEdit = (val) => {
        setJsonText(val);
        try {
            const parsed = JSON.parse(val);
            setData(parsed);
            setJsonError(null);
        } catch {
            setJsonError("Invalid JSON — fix before submitting");
        }
    };

    const removeRow = (i) => {
        const updated = { ...data, fleets: data.fleets.filter((_, idx) => idx !== i) };
        setData(updated);
        setJsonText(JSON.stringify(updated, null, 2));
    };

    const handleConfirm = () => {
        if (jsonError) return;
        onConfirm(data);
    };

    return (
        <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="pm">

                {/* Header */}
                <div className="pm__header">
                    <div className="pm__header-left">
                        <div className="pm__badge">
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div>
                            <div className="pm__title">Payload Preview</div>
                            <div className="pm__subtitle">
                                {fleets.length} fleet record{fleets.length !== 1 ? "s" : ""} · tenant{" "}
                                <code>{data.tenant_id?.slice(-8)}</code>
                            </div>
                        </div>
                    </div>
                    <button className="pm__close" onClick={onClose}>
                        <svg viewBox="0 0 14 14" fill="none">
                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="pm__tabs">
                    <button
                        className={`pm__tab ${view === "table" ? "pm__tab--active" : ""}`}
                        onClick={() => setView("table")}
                    >
                        <svg viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M1 5h14M5 5v10" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                        Table View
                    </button>
                    <button
                        className={`pm__tab ${view === "json" ? "pm__tab--active" : ""}`}
                        onClick={() => setView("json")}
                    >
                        <svg viewBox="0 0 16 16" fill="none">
                            <path d="M5 3L2 8l3 5M11 3l3 5-3 5M9 2l-2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        JSON Editor
                    </button>
                    <div className="pm__tabs-info">
                        {view === "table" ? "Click any cell to edit" : "Edit JSON directly"}
                    </div>
                </div>

                {/* Body */}
                <div className="pm__body">

                    {/* ── TABLE VIEW ── */}
                    {view === "table" && (
                        <div className="pm__table-wrap">
                            <table className="pm__table">
                                <thead>
                                    <tr>
                                        <th className="pm__th pm__th--idx">#</th>
                                        {COLS.map((c) => (
                                            <th key={c.key} className="pm__th">{c.label}</th>
                                        ))}
                                        <th className="pm__th pm__th--action" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {fleets.map((row, i) => (
                                        <tr key={i} className="pm__tr">
                                            <td className="pm__td pm__td--idx">{i + 1}</td>
                                            {COLS.map((c) => (
                                                <td key={c.key} className="pm__td">
                                                    {editingCell?.row === i && editingCell?.key === c.key ? (
                                                        <input
                                                            className="pm__cell-input"
                                                            autoFocus
                                                            value={row[c.key] ?? ""}
                                                            onChange={(e) => handleCellEdit(i, c.key, e.target.value)}
                                                            onBlur={() => setEditingCell(null)}
                                                            onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="pm__cell-val"
                                                            onClick={() => setEditingCell({ row: i, key: c.key })}
                                                            title="Click to edit"
                                                        >
                                                            {row[c.key] === null ? (
                                                                <span className="pm__null">null</span>
                                                            ) : (
                                                                row[c.key] || <span className="pm__empty-val">—</span>
                                                            )}
                                                            <svg className="pm__edit-icon" viewBox="0 0 12 12" fill="none">
                                                                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="pm__td pm__td--action">
                                                <button
                                                    className="pm__row-del"
                                                    onClick={() => removeRow(i)}
                                                    title="Remove row"
                                                >
                                                    <svg viewBox="0 0 12 12" fill="none">
                                                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── JSON VIEW ── */}
                    {view === "json" && (
                        <div className="pm__json-wrap">
                            {jsonError && <div className="pm__json-error">{jsonError}</div>}
                            <textarea
                                className="pm__json-editor"
                                value={jsonText}
                                onChange={(e) => handleJsonEdit(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pm__footer">
                    <div className="pm__footer-left">
                        <span className="pm__footer-stat">{fleets.length} records</span>
                        {jsonError && <span className="pm__footer-err">⚠ JSON error</span>}
                    </div>
                    <div className="pm__footer-right">
                        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
                        <button
                            className="btn btn--primary"
                            onClick={handleConfirm}
                            disabled={!!jsonError || fleets.length === 0}
                        >
                            Confirm & Submit
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
export default function FleetForm() {
    const [tenants, setTenants] = useState([]);
    const [clients, setClients] = useState([]);
    const [tenant, setTenant] = useState(null);
    const [uploadMode, setUploadMode] = useState("manual");

    const [fleets, setFleets] = useState([
        { initiator_name: "", price_per_unit: "", ocpiCredential: "" },
    ]);

    const [excelFile, setExcelFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [payloadPreview, setPayloadPreview] = useState(null);
    const [skipSummary, setSkipSummary] = useState(null); // { existing: [], duplicates: [] }
    const [toast, setToast] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadTenants() {
            try {
                const tenantRes = await getTenants();
                setTenants(tenantRes.data || []);
            } catch {
                showToast("error", "Failed to load tenants");
            }
        }
        loadTenants();
    }, []);

    useEffect(() => {
        async function loadOcpiClients() {
            try {
                setClients([]);
                const clientRes = await getOcpiClients(tenant?._id);
                setClients(clientRes.data || []);
            } catch {
                showToast("error", "Failed to load OCPI clients");
            }
        }
        loadOcpiClients();
    }, [tenant]);

    const isHMIL = tenant?.ocpp_party_id === "HYD";

    const showToast = (type, msg) => {
        setToast({ type, msg });
        // longer messages need more time to read
        const duration = msg.length > 60 ? 6000 : 4000;
        setTimeout(() => setToast(null), duration);
    };

    const downloadSampleExcel = () => {
        const data = [{
            initiated_by: "FLEET",
            initiator_name: "FLEET_ALPHA",
            price_per_unit: 12.5,
            ocpiCredential: "OCPI_CREDENTIAL_ID",
        }];
        const sheet = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet, "fleets");
        XLSX.writeFile(wb, "fleet_sample.xlsx");
    };

    // ── FIX 2: buildPayload — HMIL price_per_unit always null,
    //    also guard against empty string producing 0 for non-HMIL rows
    const buildPayload = (rows) => ({
        tenant_id: tenant._id,
        fleets: rows.map((r) => ({
            initiated_by: "FLEET",
            initiator_name: r.initiator_name,
            price_per_unit:
                isHMIL || r.price_per_unit === null || r.price_per_unit === ""
                    ? null
                    : Number(r.price_per_unit),
            ocpiCredential: r.ocpiCredential,
        })),
    });

    const uploadExcel = () => {
        if (!tenant) return showToast("error", "Select tenant first");
        if (!excelFile) return showToast("error", "No file selected");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target.result, { type: "array" });
            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

            // Validate OCPI credentials
            const invalid = rawRows.filter((r) => !clients.find((c) => c._id === r.ocpiCredential));
            if (invalid.length) {
                const names = invalid
                    .map((r) => r.initiator_name?.trim() || `Row ${rawRows.indexOf(r) + 1}`)
                    .join(", ");
                return showToast("error", `Invalid OCPI Credential for: ${names}`);
            }

            // ── Step 1: Deduplicate within the Excel file (case-insensitive by initiator_name)
            const seenNames = new Set();
            const uniqueRows = [];
            const intraFileDuplicates = [];
            for (const r of rawRows) {
                const key = (r.initiator_name || "").trim().toLowerCase();
                if (seenNames.has(key)) {
                    intraFileDuplicates.push(r.initiator_name);
                } else {
                    seenNames.add(key);
                    uniqueRows.push(r);
                }
            }

            // ── Step 2: Fetch existing fleet names from ChargeCloud and skip them
            let existingNames = [];
            try {
                const res = await getExistingFleets(tenant._id);
                existingNames = res.data?.names || [];
            } catch {
                showToast("error", "Could not fetch existing fleets — proceeding with full list");
            }
            const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
            const newRows = [];
            const alreadyExisting = [];
            for (const r of uniqueRows) {
                const key = (r.initiator_name || "").trim().toLowerCase();
                if (existingSet.has(key)) {
                    alreadyExisting.push(r.initiator_name);
                } else {
                    newRows.push(r);
                }
            }

            // Save skip info for display in modal
            setSkipSummary({
                existing: alreadyExisting,
                duplicates: intraFileDuplicates,
            });

            if (newRows.length === 0) {
                const reason = alreadyExisting.length
                    ? `All ${rawRows.length} record(s) already exist in ChargeCloud — nothing to upload.`
                    : `No new records found after deduplication.`;
                return showToast("error", reason);
            }

            if (alreadyExisting.length || intraFileDuplicates.length) {
                const parts = [];
                if (alreadyExisting.length) parts.push(`${alreadyExisting.length} already exist`);
                if (intraFileDuplicates.length) parts.push(`${intraFileDuplicates.length} duplicate(s) in file`);
                showToast("error", `Skipped: ${parts.join(", ")}. Previewing ${newRows.length} new record(s).`);
            }

            setPayloadPreview(buildPayload(newRows));
            setShowModal(true);
        };
        reader.readAsArrayBuffer(excelFile);
    };

    const submitManual = () => {
        if (!tenant) return showToast("error", "Select a tenant first");
        const empty = fleets.filter((f) => !f.initiator_name.trim());
        if (empty.length) return showToast("error", "All fleets need an Initiator Name");
        setPayloadPreview(buildPayload(fleets));
        setShowModal(true);
    };

    const confirmSubmit = async (finalPayload) => {
        setSubmitting(true);
        try {
            const res = await createFleet(finalPayload);
            const result = res.data;
            setShowModal(false);
            const parts = [`${result.created ?? finalPayload.fleets.length} fleet(s) created`];
            if (result.skipped_existing > 0) parts.push(`${result.skipped_existing} already existed (skipped)`);
            if (result.skipped_duplicates > 0) parts.push(`${result.skipped_duplicates} duplicate(s) skipped`);
            showToast("success", parts.join(" · "));
            setFleets([{ initiator_name: "", price_per_unit: "", ocpiCredential: "" }]);
            setSkipSummary(null);
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || "Fleet creation failed — check your connection";
            showToast("error", msg);
        } finally {
            setSubmitting(false);
        }
    };

    const addFleet = () =>
        setFleets([...fleets, { initiator_name: "", price_per_unit: "", ocpiCredential: "" }]);

    const removeFleet = (i) =>
        setFleets(fleets.filter((_, idx) => idx !== i));

    // ── FIX 3: updateFleet — HMIL rows always store null for price_per_unit
    const updateFleet = (i, key, val) => {
        const copy = [...fleets];
        copy[i][key] = key === "price_per_unit" && isHMIL ? null : val;
        setFleets(copy);
    };

    const tenantOptions = tenants.map((t) => ({
        value: t._id,
        label: `${t.name} (${t.ocpp_party_id})`,
        sub: t.ocpp_party_id,
    }));

    const clientOptions = clients.map((c) => ({
        value: c._id,
        label: `${c.partyId} — ${c.partner_name}`,
        sub: c._id,
    }));

    return (
        <div className="fp">
            {/* Ambient glows */}
            <div className="fp__glow fp__glow--1" />
            <div className="fp__glow fp__glow--2" />

            {/* ── HEADER ── */}
            <header className="fp__header">
                <div className="fp__eyebrow">
                    <span className="fp__eyebrow-pip" />
                    Fleet Management
                </div>
                <h1 className="fp__title">Create Fleet</h1>
                <p className="fp__sub">Configure and provision new fleet credentials for a tenant.</p>
            </header>

            {/* ── TOAST ── */}
            {toast && (
                <div className={`fp__toast ${toast.type === "error" ? "fp__toast--err" : "fp__toast--ok"}`}>
                    <span className="fp__toast-icon">
                        {toast.type === "error" ? (
                            <svg viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </span>
                    {toast.msg}
                </div>
            )}

            {/* ── STEP 1: TENANT ── */}
            <div className="fp__card">
                <div className="fp__card-label">
                    <span className="fp__step">01</span>
                    Select Tenant
                    <span className="fp__req">required</span>
                </div>
                <SearchDropdown
                    options={tenantOptions}
                    value={tenant?._id || ""}
                    onChange={(v) => setTenant(tenants.find((t) => t._id === v))}
                    placeholder="Search tenant by name or party ID…"
                />
                {tenant && (
                    <div className="fp__tenant-info">
                        <div className="fp__ti-row">
                            <span className="fp__ti-label">Party ID</span>
                            <span className="fp__ti-val fp__ti-val--accent">{tenant.ocpp_party_id}</span>
                        </div>
                        <div className="fp__ti-divider" />
                        <div className="fp__ti-row">
                            <span className="fp__ti-label">Tenant ID</span>
                            <code className="fp__ti-val fp__ti-val--mono">{tenant._id}</code>
                        </div>
                        {isHMIL && (
                            <>
                                <div className="fp__ti-divider" />
                                <div className="fp__ti-row">
                                    <span className="fp__ti-val fp__ti-val--warn">
                                        ⚡ HMIL tenant — price_per_unit will be set to null
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── STEP 2: MODE TOGGLE ── */}
            {tenant && (
                <div className="fp__card">
                    <div className="fp__card-label">
                        <span className="fp__step">02</span>
                        Upload Mode
                    </div>
                    <div className="fp__toggle">
                        <button
                            className={`fp__toggle-btn ${uploadMode === "manual" ? "fp__toggle-btn--on" : ""}`}
                            onClick={() => setUploadMode("manual")}
                        >
                            <svg viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                            </svg>
                            Manual Entry
                        </button>
                        <button
                            className={`fp__toggle-btn ${uploadMode === "bulk" ? "fp__toggle-btn--on" : ""}`}
                            onClick={() => setUploadMode("bulk")}
                        >
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            Bulk Excel
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3A: BULK ── */}
            {tenant && uploadMode === "bulk" && (
                <div className="fp__card">
                    <div className="fp__card-label">
                        <span className="fp__step">03</span>
                        Upload Excel File
                    </div>
                    <p className="fp__bulk-hint">
                        Download the template, populate your fleet data, then upload.
                        OCPI credential IDs are validated automatically.
                    </p>
                    <div className="fp__bulk-row">
                        <button className="btn btn--ghost" onClick={downloadSampleExcel}>
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v8M4 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            Template
                        </button>
                        <label className="fp__file-btn">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setExcelFile(e.target.files[0])}
                            />
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" stroke="currentColor" strokeWidth="1.4" />
                                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                            {excelFile ? excelFile.name : "Choose file"}
                        </label>
                        {excelFile && (
                            <button className="btn btn--primary" onClick={uploadExcel}>
                                Preview & Submit
                                <svg viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── STEP 3B: MANUAL ── */}
            {tenant && uploadMode === "manual" && (
                <div className="fp__card">
                    <div className="fp__card-head">
                        <div className="fp__card-label">
                            <span className="fp__step">03</span>
                            Fleet Configuration
                        </div>
                        <span className="fp__badge">
                            {fleets.length} fleet{fleets.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <div className="fp__fleet-list">
                        {fleets.map((fleet, i) => (
                            <div className="fp__fleet-row" key={i}>
                                <span className="fp__fleet-num">{String(i + 1).padStart(2, "0")}</span>
                                <div className="fp__fleet-fields">
                                    <div className="fp__field-group">
                                        <label className="fp__field-label">Initiator Name</label>
                                        <input
                                            className="fp__input"
                                            placeholder="e.g. FLEET_ALPHA"
                                            value={fleet.initiator_name}
                                            onChange={(e) => updateFleet(i, "initiator_name", e.target.value)}
                                        />
                                    </div>
                                    <div className="fp__field-group">
                                        <label className="fp__field-label">
                                            Price / Unit
                                            {isHMIL && <span className="fp__field-note">auto-null</span>}
                                        </label>
                                        <input
                                            className="fp__input"
                                            placeholder={isHMIL ? "Null (HMIL)" : "0.00"}
                                            value={isHMIL ? "" : fleet.price_per_unit ?? ""}
                                            disabled={isHMIL}
                                            onChange={(e) => updateFleet(i, "price_per_unit", e.target.value)}
                                        />
                                    </div>
                                    <div className="fp__field-group fp__field-group--full">
                                        <label className="fp__field-label">OCPI Client</label>
                                        <SearchDropdown
                                            options={clientOptions}
                                            value={fleet.ocpiCredential}
                                            onChange={(v) => updateFleet(i, "ocpiCredential", v)}
                                            placeholder="Search OCPI client by party ID or name…"
                                        />
                                    </div>
                                </div>
                                {fleets.length > 1 && (
                                    <button
                                        className="fp__fleet-remove"
                                        onClick={() => removeFleet(i)}
                                        title="Remove fleet"
                                    >
                                        <svg viewBox="0 0 14 14" fill="none">
                                            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="fp__actions">
                        <button className="btn btn--ghost" onClick={addFleet}>
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            Add Fleet
                        </button>
                        <button className="btn btn--primary" onClick={submitManual} disabled={submitting}>
                            Preview & Submit
                            <svg viewBox="0 0 16 16" fill="none">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── PAYLOAD MODAL ── */}
            {showModal && payloadPreview && (
                <PayloadModal
                    payload={payloadPreview}
                    onClose={() => setShowModal(false)}
                    onConfirm={confirmSubmit}
                />
            )}
        </div>
    );
}