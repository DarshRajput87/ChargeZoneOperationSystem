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

  // 🔥 Auto generate page name from route
  const getPageName = () => {
    const path = location.pathname;

    if (path === "/dashboard") return "Dashboard";

    // convert /station-explorer → Station Explorer
    const cleaned = path.replace("/", "");
    if (!cleaned) return "";

    return cleaned
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
        ChargeZone Operations {getPageName() && ` / ${getPageName()}`}
      </div>

      <div className="topbar-right">
        <span>{user?.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Topbar;