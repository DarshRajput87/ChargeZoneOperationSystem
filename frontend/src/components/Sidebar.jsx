import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/Logo.png";

const Sidebar = ({ isOpen, onClose }) => {
  const [openModule, setOpenModule] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleModule = (module) => {
    setOpenModule(openModule === module ? null : module);
    if (openModule === module) setOpenSubMenu(null);
  };

  const toggleSubMenu = (sub) => {
    setOpenSubMenu(openSubMenu === sub ? null : sub);
  };

  /* ── MOBILE SIDEBAR ── */
  if (isMobile) {
    return (
      <div className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="logo" />
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <nav>

          {/* User Accounts */}
          <NavLink to="/customer-management" onClick={onClose}>User Accounts</NavLink>

          {/* User Segments */}
          <NavLink to="/user-segmentation" onClick={onClose}>User Segments</NavLink>

          {/* Support */}
          <div className="menu-module">
            <div
              className="module-title"
              onClick={() => toggleModule("user-review")}
            >
              Support
            </div>

            {openModule === "user-review" && (
              <div className="submenu">
                <NavLink to="/user-review/pending-tickets" className="submenu-item" onClick={onClose}>
                  Open Tickets
                </NavLink>
                <NavLink to="/user-review/closed-tickets" className="submenu-item" onClick={onClose}>
                  Resolved Tickets
                </NavLink>
              </div>
            )}
          </div>

          {/* Review Insights */}
          <NavLink to="/user-review/review-analysis" onClick={onClose}>Review Insights</NavLink>

        </nav>
      </div>
    );
  }

  /* ── DESKTOP SIDEBAR ── */
  return (
    <div className={`sidebar${isOpen ? " sidebar-open" : ""}`}>

      <div className="sidebar-logo">
        <img src={logo} alt="logo" />
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">✕</button>
      </div>

      <nav>

        <NavLink to="/dashboard" onClick={onClose}>Command Center</NavLink>
        <NavLink to="/station-explorer" onClick={onClose}>Station Network</NavLink>
        <NavLink to="/fleet" onClick={onClose}>Vehicle Fleet</NavLink>
        <NavLink to="/simulator" onClick={onClose}>Charger Simulator</NavLink>

        {/* EMSP MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("emsp")}>
            eMobility Services (EMSP)
          </div>

          {openModule === "emsp" && (
            <div className="submenu">

              <div className="submenu-group">
                <div
                  className="submenu-item submenu-group-title"
                  onClick={() => toggleSubMenu("inprogress")}
                >
                  <span>In-Progress Sessions</span>
                  <span className="submenu-arrow">
                    {openSubMenu === "inprogress" ? "▾" : "▸"}
                  </span>
                </div>

                {openSubMenu === "inprogress" && (
                  <div className="submenu submenu-nested">
                    <NavLink to="/emsp-in-progress" className="submenu-item submenu-item--nested" onClick={onClose}>
                      EMSP In-Progress Sessions
                    </NavLink>
                    <NavLink to="/emsp-in-progress-analysis" className="submenu-item submenu-item--nested" onClick={onClose}>
                      EMSP In-Progress Analytics
                    </NavLink>
                  </div>
                )}
              </div>

              <div className="submenu-group">
                <div
                  className="submenu-item submenu-group-title"
                  onClick={() => toggleSubMenu("faulty")}
                >
                  <span>Fault Management</span>
                  <span className="submenu-arrow">
                    {openSubMenu === "faulty" ? "▾" : "▸"}
                  </span>
                </div>

                {openSubMenu === "faulty" && (
                  <div className="submenu submenu-nested">
                    <NavLink to="/emsp-faulty-sessions" className="submenu-item submenu-item--nested" onClick={onClose}>
                      EMSP Fault Sessions
                    </NavLink>
                    <NavLink to="/emsp-faulty-sesssion-analysis" className="submenu-item submenu-item--nested" onClick={onClose}>
                      EMSP Fault Diagnostics
                    </NavLink>
                  </div>
                )}
              </div>

              <NavLink to="/emsp-CDR-Builder" className="submenu-item" onClick={onClose}>
                EMSP Session Settlement
              </NavLink>

            </div>
          )}
        </div>

        {/* CPO MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("cpo")}>
            Charge Point Operations (CPO)
          </div>

          {openModule === "cpo" && (
            <div className="submenu">
              <NavLink to="/cpo-CDR-Push" className="submenu-item" onClick={onClose}>
                CPO CDR Dispatch
              </NavLink>
            </div>
          )}
        </div>

        {/* User EXPERIENCE MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("user-review")}>
            User Experience
          </div>

          {openModule === "user-review" && (
            <div className="submenu">
              <NavLink to="/customer-management" onClick={onClose}>User Accounts</NavLink>
              <NavLink to="/user-segmentation" className="submenu-item" onClick={onClose}>User Segments</NavLink>
              <NavLink to="/user-review/pending-tickets" className="submenu-item" onClick={onClose}>
                Open Tickets
              </NavLink>
              <NavLink to="/user-review/closed-tickets" className="submenu-item" onClick={onClose}>
                Resolved Tickets
              </NavLink>
              <NavLink to="/user-review/review-analysis" className="submenu-item" onClick={onClose}>
                Review Insights
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/analysis" onClick={onClose}>OCPI Analytics</NavLink>
        <NavLink to="/ocpi-analysis-charts" onClick={onClose}>OCPI Insights</NavLink>
        <NavLink to="/settings" onClick={onClose}>Settings</NavLink>

      </nav>
    </div>
  );
};

export default Sidebar;