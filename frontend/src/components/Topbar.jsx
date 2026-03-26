import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Topbar = ({ onMenuToggle }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // 🔥 Auto generate dynamic breadcrumbs from route
  const renderBreadcrumbs = () => {
    const path = location.pathname;

    const Chevron = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, margin: "0 8px", flexShrink: 0, marginTop: "1px" }}>
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    );

    const HomeIcon = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", color: "var(--accent)", marginTop: "-1px" }}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    );

    const baseCrumb = (
      <>
        <HomeIcon />
        <span style={{ fontWeight: 500, color: "var(--text)", letterSpacing: "0.02em" }}>ChargeZone</span>
      </>
    );

    if (path === "/" || path === "/dashboard") {
      return (
        <div style={{ display: "flex", alignItems: "center" }}>
          {baseCrumb}
          <Chevron />
          <span style={{ color: "var(--text)", fontWeight: 600 }}>Dashboard</span>
        </div>
      );
    }

    const segments = path.split("/").filter(Boolean);
    const formattedSegments = segments.map((segment) =>
      segment
        .split("-")
        .map((word) => {
          const lower = word.toLowerCase();
          if (lower === "ocpi") return "OCPI";
          if (lower === "emsp") return "EMSP";
          if (lower === "cpo") return "CPO";
          if (lower === "cdr") return "CDR";
          if (lower === "sla") return "SLA";
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ")
    );

    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        {baseCrumb}
        {formattedSegments.map((seg, idx) => {
          const isLast = idx === formattedSegments.length - 1;
          return (
            <em key={idx} style={{ fontStyle: "normal", display: "inline-flex", alignItems: "center" }}>
              <Chevron />
              {isLast ? <span style={{ color: "var(--text)", fontWeight: 600 }}>{seg}</span> : seg}
            </em>
          );
        })}
      </div>
    );
  };

  return (
    <div className="topbar">
      {/* Hamburger — only visible on mobile */}
      <button
        className="topbar-menu-btn"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className="topbar-title">
        {renderBreadcrumbs()}
      </div>

      <div className="topbar-right">
        <span>{user?.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Topbar;