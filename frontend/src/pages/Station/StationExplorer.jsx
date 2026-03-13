import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./stationExplorer.css";

const BASE_URL = "http://13.232.112.152:5000/api/station-explorer";

/* ─── All Indian States & UTs ─── */
const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/* ─── EV Loader — Redesigned ─── */
const EVLoader = () => (
  <div className="ev-loader-wrap">
    <div className="ev-loader-inner">
      {/* Orbit ring system */}
      <div className="ev-orbit">
        <div className="ev-ring-outer" />
        <div className="ev-ring-mid" />
        <div className="ev-ring-inner" />
      </div>

      {/* Text + shimmer bar */}
      <div className="ev-loader-bottom">
        <span className="ev-loader-text">Fetching Stations</span>
        <div className="ev-loader-bar" />
      </div>
    </div>
  </div>
);

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    Available: "badge--available",
    Unavailable: "badge--unavailable",
    "In Use": "badge--inuse",
    "Coming Soon": "badge--coming",
  };
  return (
    <span className={`status-badge ${map[status] || "badge--unavailable"}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};

/* ─── Copy Toast ─── */
const CopyToast = ({ show }) => (
  <div className={`copy-toast ${show ? "copy-toast--show" : ""}`}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    Copied to clipboard
  </div>
);

/* ─── Custom Select ─── */
const FilterSelect = ({ value, onChange, children, icon }) => (
  <div className="filter-select-wrap">
    {icon && <span className="filter-icon">{icon}</span>}
    <select value={value} onChange={onChange} className="filter-select">
      {children}
    </select>
    <svg className="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </div>
);

const StationExplorer = () => {
  const [stations, setStations] = useState([]);
  const [chargers, setChargers] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loadingChargers, setLoadingChargers] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [externalFilter, setExternalFilter] = useState(""); // ← NEW
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const toastHide = useRef(null);
  const toastClear = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (stateFilter) params.state = stateFilter;
      if (externalFilter !== "") params.isExternal = externalFilter; // ← NEW
      const res = await axios.get(BASE_URL, { params });
      setStations(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Station fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, [debouncedSearch, statusFilter, stateFilter, externalFilter, page]);

  const toggleChargers = async (stationId) => {
    if (expanded[stationId]) {
      setExpanded((p) => ({ ...p, [stationId]: false }));
      return;
    }
    if (!chargers[stationId]) {
      setLoadingChargers((p) => ({ ...p, [stationId]: true }));
      try {
        const res = await axios.get(`${BASE_URL}/${stationId}/chargers`);
        setChargers((p) => ({ ...p, [stationId]: res.data }));
      } finally {
        setLoadingChargers((p) => ({ ...p, [stationId]: false }));
      }
    }
    setExpanded((p) => ({ ...p, [stationId]: true }));
  };

  const copyMongo = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setShowToast(true);
    clearTimeout(toastHide.current);
    clearTimeout(toastClear.current);
    toastHide.current = setTimeout(() => setShowToast(false), 2000);
    toastClear.current = setTimeout(() => setCopied(null), 2300);
  };

  const totalPages = Math.ceil(total / 10);

  // ← NEW: any active filter check includes externalFilter
  const hasActiveFilters = statusFilter || stateFilter || externalFilter !== "";

  return (
    <div className="station-page">
      <CopyToast show={showToast} />

      {/* ── Header ── */}
      <div className="station-header">
        <div className="header-left">
          <div className="header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8401c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h2>Station Explorer</h2>
            <p className="header-sub">{total > 0 ? `${total} stations found` : "Search & manage EV stations"}</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="search-wrap">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Name / Station ID / Mongo ID"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            />
            {search && (
              <button className="search-clear" onClick={() => { setSearch(""); setPage(1); }}>✕</button>
            )}
          </div>

          <FilterSelect value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>}
          >
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Coming Soon">Coming Soon</option>
          </FilterSelect>

          <FilterSelect value={stateFilter} onChange={(e) => { setPage(1); setStateFilter(e.target.value); }}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
          >
            <option value="">All States</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </FilterSelect>

          {/* ── External Filter ── NEW ── */}
          <FilterSelect
            value={externalFilter}
            onChange={(e) => { setPage(1); setExternalFilter(e.target.value); }}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            }
          >
            <option value="">All Stations</option>
            <option value="true">External Only</option>
            <option value="false">Internal Only</option>
          </FilterSelect>

          {hasActiveFilters && (
            <button
              className="btn-clear-filters"
              onClick={() => { setStatusFilter(""); setStateFilter(""); setExternalFilter(""); setPage(1); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="filter-tags">
          {statusFilter && (
            <span className="filter-tag">
              {statusFilter}
              <button onClick={() => { setStatusFilter(""); setPage(1); }}>✕</button>
            </span>
          )}
          {stateFilter && (
            <span className="filter-tag">
              {stateFilter}
              <button onClick={() => { setStateFilter(""); setPage(1); }}>✕</button>
            </span>
          )}
          {/* ── External filter tag ── NEW ── */}
          {externalFilter !== "" && (
            <span className="filter-tag">
              {externalFilter === "true" ? "External Only" : "Internal Only"}
              <button onClick={() => { setExternalFilter(""); setPage(1); }}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="station-table-wrap">
        {loading && <EVLoader />}

        <div className={`station-table ${loading ? "blur" : ""}`}>
          <div className="table-header">
            <div>Name</div>
            <div>Status</div>
            <div>Station ID</div>
            <div>External</div>
            <div>Actions</div>
          </div>

          {stations.length === 0 && !loading && (
            <div className="empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e3250" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No stations found</p>
            </div>
          )}

          {stations.map((station, i) => (
            <div key={station._id} className="row-wrap" style={{ animationDelay: `${i * 35}ms` }}>
              <div className="table-row">
                <div className="cell-name">{station.name}</div>
                <div><StatusBadge status={station.status} /></div>
                <div className="cell-mono">{station.station_id}</div>
                <div>
                  <span className={`ext-badge ${station.is_external_station ? "ext-yes" : ""}`}>
                    {station.is_external_station ? "Yes" : "No"}
                  </span>
                </div>

                <div className="action-buttons">
                  <button
                    className={`btn-copy ${copied === station._id ? "active" : ""}`}
                    onClick={() => copyMongo(station._id)}
                    title="Copy Mongo ID"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  <button
                    className={`btn-charger ${expanded[station._id] ? "open" : ""}`}
                    onClick={() => toggleChargers(station._id)}
                  >
                    {loadingChargers[station._id] ? (
                      <><span className="btn-spinner" /> Loading</>
                    ) : expanded[station._id] ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        Chargers
                      </>
                    )}
                  </button>
                </div>
              </div>

              {expanded[station._id] && chargers[station._id] && (
                <div className="charger-panel">
                  <div className="charger-header">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Chargers — {chargers[station._id].length}
                  </div>

                  {chargers[station._id].length === 0 ? (
                    <div className="charger-empty">No chargers found</div>
                  ) : (
                    <div className="charger-grid">
                      {chargers[station._id].map((c) => (
                        <div key={c._id} className="charger-card">
                          <div className="charger-top">
                            <span className="charger-id">{c.charger_id}</span>
                            <button
                              className={`btn-copy btn-copy--sm ${copied === c._id ? "active" : ""}`}
                              onClick={() => copyMongo(c._id)}
                              title="Copy Mongo ID"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                          <StatusBadge status={c.charger_status} />
                          <div className="charger-tariff">₹{c.tariff ?? "—"}<span> / kWh</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="pagination">
        <button className="btn-page" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Prev
        </button>
        <span className="page-info">Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong></span>
        <button className="btn-page" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
};

export default StationExplorer;