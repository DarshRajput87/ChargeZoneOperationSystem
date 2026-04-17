import { useState, useEffect } from "react";
import API from "../../services/api";
import "./Settings.css";

// ─── SVG Line Icons ─────────────────────────────────────────────────────────
const Icon = {
  settings:   <svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  users:      <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  userPlus:   <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  edit:       <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  search:     <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  trash:      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  ban:        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  check:      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  eyeOn:      <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:     <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  plus:       <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  // Module icons (line style)
  dashboard:  <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  map:        <svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  plug:       <svg viewBox="0 0 24 24"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V8z"/></svg>,
  car:        <svg viewBox="0 0 24 24"><path d="M16 3H1v13h15V3z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  clock:      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  barChart:   <svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  alertTri:   <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  microscope: <svg viewBox="0 0 24 24"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2H9z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>,
  hammer:     <svg viewBox="0 0 24 24"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></svg>,
  upload:     <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  ticket:     <svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
  checkCircle:<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  msgCircle:  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  radio:      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>,
  lineChart:  <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  usersIcon:  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  gear:       <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// Map module keys to icons
const MODULE_ICONS = {
  "simulator":                 Icon.plug,
  "fleet":                     Icon.car,
  "emsp-in-progress":          Icon.clock,
  "emsp-in-progress-analysis": Icon.barChart,
  "emsp-faulty-sessions":      Icon.alertTri,
  "emsp-faulty-analysis":      Icon.microscope,
  "emsp-cdr-builder":          Icon.hammer,
  "cpo-cdr-push":              Icon.upload,
  "pending-tickets":           Icon.ticket,
  "closed-tickets":            Icon.checkCircle,
  "review-analysis":           Icon.msgCircle,
  "analysis":                  Icon.radio,
  "ocpi-charts":               Icon.lineChart,
  "customer-management":       Icon.usersIcon,
  "settings":                  Icon.gear,
};

// ─── Dynamic Module Registry ────────────────────────────────────────────────
export const MODULE_REGISTRY = [
  { key: "simulator",                  label: "Charger Simulator",           path: "/simulator",                        group: "Operations" },
  { key: "fleet",                      label: "Fleet Management",            path: "/fleet",                            group: "Operations" },
  { key: "emsp-in-progress",           label: "EMSP In-Progress SLA",        path: "/emsp-in-progress",                 group: "EMSP" },
  { key: "emsp-in-progress-analysis",  label: "EMSP In-Progress Analysis",   path: "/emsp-in-progress-analysis",        group: "EMSP" },
  { key: "emsp-faulty-sessions",       label: "Faulty Sessions",             path: "/emsp-faulty-sessions",             group: "EMSP" },
  { key: "emsp-faulty-analysis",       label: "Faulty Session Analysis",     path: "/emsp-faulty-sesssion-analysis",    group: "EMSP" },
  { key: "emsp-cdr-builder",           label: "CDR Builder",                 path: "/emsp-CDR-Builder",                 group: "CDR" },
  { key: "cpo-cdr-push",               label: "CDR Push",                    path: "/cpo-CDR-Push",                     group: "CDR" },
  { key: "pending-tickets",            label: "Pending Tickets",             path: "/user-review/pending-tickets",      group: "Helpdesk" },
  { key: "closed-tickets",             label: "Closed Tickets",              path: "/user-review/closed-tickets",       group: "Helpdesk" },
  { key: "review-analysis",            label: "Review Analysis",             path: "/user-review/review-analysis",      group: "Helpdesk" },
  { key: "analysis",                   label: "OCPI Analysis",               path: "/analysis",                         group: "OCPI" },
  { key: "ocpi-charts",                label: "OCPI Charts",                 path: "/ocpi-analysis-charts",             group: "OCPI" },
  { key: "customer-management",        label: "Customer Management",         path: "/customer-management",              group: "Admin" },
  { key: "settings",                   label: "Settings",                    path: "/settings",                         group: "Admin" },
];

const GROUPS = [...new Set(MODULE_REGISTRY.map((m) => m.group))];

const DEFAULT_ROLES = ["ADMIN", "OPS", "SUPPORT", "VIEWER"];
const ROLE_COLORS = {
  ADMIN: "#ef4444", OPS: "#f59e0b", SUPPORT: "#3b82f6", VIEWER: "#6b7280",
};

// Generate a color for custom roles based on the string
const hashRoleColor = (role) => {
  let hash = 0;
  for (let i = 0; i < role.length; i++) hash = role.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 55%)`;
};

const getRoleColor = (role) => ROLE_COLORS[role] || hashRoleColor(role);

const DEFAULT_MODULES = MODULE_REGISTRY.map((m) => m.key);

// ─── Helpers ────────────────────────────────────────────────────────────────
const initForm = () => ({
  name: "", email: "", password: "", role: "VIEWER",
  allowedModules: DEFAULT_MODULES,
});

// ─── Sub-components ─────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return (
    <span className="st-role-badge" style={{ "--rc": getRoleColor(role) }}>
      {role}
    </span>
  );
}

function StatusDot({ status }) {
  return (
    <span className={`st-status-dot ${status === "ACTIVE" ? "active" : "disabled"}`} />
  );
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`st-toggle ${checked ? "on" : "off"} ${disabled ? "locked" : ""}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
    >
      <span className="st-toggle-thumb" />
    </button>
  );
}

// ─── Module Grid — Accordion with toggle rows ────────────────────────────────
function ModuleGrid({ selected, onChange }) {
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(GROUPS.map((g) => [g, true]))
  );

  const toggle = (key) => {
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  const toggleGroup = (group) => {
    const keys = MODULE_REGISTRY.filter((m) => m.group === group).map((m) => m.key);
    const noneOn = keys.every((k) => !selected.includes(k));
    if (noneOn) onChange([...new Set([...selected, ...keys])]);
    else onChange(selected.filter((k) => !keys.includes(k)));
  };

  const collapseGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="st-accordion">
      {GROUPS.map((group) => {
        const mods = MODULE_REGISTRY.filter((m) => m.group === group);
        const anyOn = mods.some((m) => selected.includes(m.key));
        const groupOn = anyOn;
        const isOpen = openGroups[group];

        return (
          <div key={group} className="st-acc-block">
            <div className="st-acc-header" onClick={() => collapseGroup(group)}>
              <div className="st-acc-left">
                <span className="st-acc-caret">{isOpen ? "−" : "+"}</span>
                <span className="st-acc-group-name">{group}</span>
              </div>
              <div className="st-acc-right">
                <Toggle
                  checked={groupOn}
                  onChange={() => toggleGroup(group)}
                />
                <span className={`st-acc-arrow ${isOpen ? "open" : ""}`}>▼</span>
              </div>
            </div>

            {isOpen && (
              <div className={`st-acc-body ${!groupOn ? "group-off" : ""}`}>
                <div className="st-acc-body-inner">
                  <p className="st-child-label">Child Modules</p>
                  {mods.map((mod, i) => {
                    const isChecked = selected.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        className={`st-acc-row ${i < mods.length - 1 ? "bordered" : ""} ${!groupOn ? "row-disabled" : ""}`}
                      >
                        <span className="st-acc-mod-name">
                          {MODULE_ICONS[mod.key] || Icon.dashboard}
                          {mod.label}
                        </span>
                        <Toggle
                          checked={isChecked}
                          onChange={() => toggle(mod.key)}
                          disabled={!groupOn}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initForm());
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [expandedUser, setExpandedUser] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [customRoleInput, setCustomRoleInput] = useState("");

  // Combined roles: default + custom ones
  const allRoles = [...DEFAULT_ROLES, ...customRoles];

  // ── Fetch users ──
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/users");
      setUsers(data);
      // Extract any custom roles from existing users
      const existingRoles = new Set(data.map((u) => u.role));
      const extras = [...existingRoles].filter((r) => !DEFAULT_ROLES.includes(r));
      if (extras.length) setCustomRoles((prev) => [...new Set([...prev, ...extras])]);
    } catch {
      /* handle */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Add custom role ──
  const addCustomRole = () => {
    const val = customRoleInput.trim().toUpperCase();
    if (!val || allRoles.includes(val)) { setCustomRoleInput(""); return; }
    setCustomRoles((prev) => [...prev, val]);
    setField("role", val);
    setCustomRoleInput("");
  };

  // ── Form helpers ──
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      allowedModules: user.allowedModules ?? DEFAULT_MODULES,
    });
    // If this user has a custom role, make sure it's in our list
    if (!DEFAULT_ROLES.includes(user.role) && !customRoles.includes(user.role)) {
      setCustomRoles((prev) => [...prev, user.role]);
    }
    setEditId(user._id);
    setTab("create");
  };

  const resetForm = () => { setForm(initForm()); setEditId(null); setShowPw(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editId && !payload.password) delete payload.password;
      if (editId) {
        await API.put(`/users/${editId}`, payload);
      } else {
        await API.post("/users", payload);
      }
      resetForm();
      setTab("users");
      fetchUsers();
    } catch {
      /* toast already handled by interceptor */
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    const next = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await API.patch(`/users/${user._id}/status`, { status: next });
      fetchUsers();
    } catch { /* */ }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
    } catch { /* */ }
  };

  // ── Filtered users ──
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = filterRole === "ALL" || u.role === filterRole;
    return matchQ && matchR;
  });

  // ── Render ──
  return (
    <div className="st-root">
      {/* Header */}
      <div className="st-header">
        <div className="st-header-left">
          <div className="st-header-icon">{Icon.settings}</div>
          <div>
            <h1 className="st-title">Settings</h1>
            <p className="st-subtitle">Manage users &amp; module access</p>
          </div>
        </div>
        <div className="st-header-right">
          <span className="st-count">{users.length} users</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="st-tabs">
        <button
          className={`st-tab ${tab === "users" ? "active" : ""}`}
          onClick={() => { setTab("users"); resetForm(); }}
        >
          {Icon.users} All Users
        </button>
        <button
          className={`st-tab ${tab === "create" ? "active" : ""}`}
          onClick={() => { setTab("create"); resetForm(); }}
        >
          {editId ? Icon.edit : Icon.userPlus} {editId ? "Edit User" : "Create User"}
        </button>
      </div>

      {/* ── Users List ── */}
      {tab === "users" && (
        <div className="st-panel">
          <div className="st-toolbar">
            <div className="st-search-wrap">
              <span className="st-search-icon">{Icon.search}</span>
              <input
                className="st-search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="st-filter-roles">
              {["ALL", ...allRoles].map((r) => (
                <button
                  key={r}
                  className={`st-filter-btn ${filterRole === r ? "active" : ""}`}
                  onClick={() => setFilterRole(r)}
                  style={r !== "ALL" ? { "--rc": getRoleColor(r) } : {}}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="st-loading">
              <div className="st-spinner" />
              <p>Loading users…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="st-empty">
              {Icon.search}
              <p>No users found</p>
            </div>
          ) : (
            <div className="st-user-list">
              {filtered.map((user) => (
                <div key={user._id} className="st-user-card">
                  <div className="st-user-main" onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}>
                    <div className="st-user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="st-user-info">
                      <div className="st-user-name">
                        <StatusDot status={user.status} />
                        {user.name}
                      </div>
                      <div className="st-user-email">{user.email}</div>
                    </div>
                    <div className="st-user-meta">
                      <RoleBadge role={user.role} />
                      <span className="st-module-count">
                        {(user.allowedModules ?? MODULE_REGISTRY).length} modules
                      </span>
                    </div>
                    <div className="st-user-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="st-btn-icon edit" title="Edit" onClick={() => startEdit(user)}>{Icon.edit}</button>
                      <button
                        className={`st-btn-icon ${user.status === "ACTIVE" ? "disable" : "enable"}`}
                        title={user.status === "ACTIVE" ? "Disable" : "Enable"}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === "ACTIVE" ? Icon.ban : Icon.check}
                      </button>
                      <button className="st-btn-icon del" title="Delete" onClick={() => deleteUser(user._id)}>{Icon.trash}</button>
                    </div>
                    <span className="st-expand-arrow">{expandedUser === user._id ? "▲" : "▼"}</span>
                  </div>

                  {expandedUser === user._id && (
                    <div className="st-user-modules">
                      <p className="st-modules-label">Allowed Modules</p>
                      <div className="st-module-tags">
                        {MODULE_REGISTRY.map((mod) => {
                          const allowed = (user.allowedModules ?? MODULE_REGISTRY.map(m => m.key)).includes(mod.key);
                          return (
                            <span key={mod.key} className={`st-mod-tag ${allowed ? "allowed" : "blocked"}`}>
                              {MODULE_ICONS[mod.key] || Icon.dashboard} {mod.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit ── */}
      {tab === "create" && (
        <div className="st-panel st-form-panel">
          <form className="st-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="st-form-section">
              <h2 className="st-section-title">
                {editId ? "Edit User" : "New User"}
              </h2>

              <div className="st-form-row two-col">
                <div className="st-field">
                  <label className="st-label">Full Name</label>
                  <input
                    className="st-input"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Email</label>
                  <input
                    type="email"
                    className="st-input"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="st-form-row two-col">
                <div className="st-field">
                  <label className="st-label">
                    Password {editId && <span className="st-hint">(leave blank to keep)</span>}
                  </label>
                  <div className="st-pw-wrap">
                    <input
                      type={showPw ? "text" : "password"}
                      className="st-input"
                      placeholder={editId ? "••••••••" : "Min 8 characters"}
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      required={!editId}
                      minLength={editId ? undefined : 8}
                    />
                    <button type="button" className="st-pw-toggle" onClick={() => setShowPw((s) => !s)}>
                      {showPw ? Icon.eyeOff : Icon.eyeOn}
                    </button>
                  </div>
                </div>
                <div className="st-field">
                  <label className="st-label">Role</label>
                  <div className="st-role-select">
                    {allRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`st-role-btn ${form.role === r ? "selected" : ""}`}
                        style={{ "--rc": getRoleColor(r) }}
                        onClick={() => setField("role", r)}
                      >
                        {r}
                      </button>
                    ))}
                    <div className="st-custom-role-wrap">
                      <input
                        className="st-custom-role-input"
                        placeholder="Custom…"
                        value={customRoleInput}
                        onChange={(e) => setCustomRoleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomRole(); } }}
                        maxLength={20}
                      />
                      <button type="button" className="st-add-role-btn" onClick={addCustomRole} title="Add custom role">
                        {Icon.plus}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="st-form-section">
              <div className="st-section-header">
                <h2 className="st-section-title">Module Permissions</h2>
                <div className="st-quick-actions">
                  <button type="button" className="st-quick-btn" onClick={() => setField("allowedModules", MODULE_REGISTRY.map(m => m.key))}>
                    Grant All
                  </button>
                  <button type="button" className="st-quick-btn danger" onClick={() => setField("allowedModules", [])}>
                    Revoke All
                  </button>
                  <span className="st-sel-count">
                    {form.allowedModules.length} / {MODULE_REGISTRY.length} selected
                  </span>
                </div>
              </div>

              <ModuleGrid
                selected={form.allowedModules}
                onChange={(v) => setField("allowedModules", v)}
              />
            </div>

            <div className="st-form-footer">
              <button type="button" className="st-btn secondary" onClick={() => { resetForm(); setTab("users"); }}>
                Cancel
              </button>
              <button type="submit" className="st-btn primary" disabled={saving}>
                {saving ? <span className="st-spinner sm" /> : null}
                {saving ? "Saving…" : editId ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}