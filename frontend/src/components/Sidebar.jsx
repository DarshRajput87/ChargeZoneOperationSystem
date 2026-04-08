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

          {/* Customer Management */}
          <NavLink to="/customer-management" onClick={onClose}>Customer Management</NavLink>

          {/* User Segmentation */}
          <NavLink to="/user-segmentation" onClick={onClose}>User Segmentation</NavLink>

          {/* User Review */}
          <div className="menu-module">
            <div
              className="module-title"
              onClick={() => toggleModule("user-review")}
            >
              User Review
            </div>

            {openModule === "user-review" && (
              <div className="submenu">
                <NavLink to="/user-review/pending-tickets" className="submenu-item" onClick={onClose}>
                  Pending Tickets
                </NavLink>
                <NavLink to="/user-review/closed-tickets" className="submenu-item" onClick={onClose}>
                  Closed Tickets
                </NavLink>
              </div>
            )}
          </div>

          {/* Review Analysis */}
          <NavLink to="/user-review/review-analysis" onClick={onClose}>Review Analysis</NavLink>

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

        <NavLink to="/dashboard" onClick={onClose}>Dashboard</NavLink>
        <NavLink to="/station-explorer" onClick={onClose}>Station Explorer</NavLink>
        <NavLink to="/fleet" onClick={onClose}>Fleet</NavLink>
        <NavLink to="/simulator" onClick={onClose}>Charger Simulator</NavLink>

        {/* EMSP MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("emsp")}>
            EMSP
          </div>

          {openModule === "emsp" && (
            <div className="submenu">

              <div className="submenu-group">
                <div
                  className="submenu-item submenu-group-title"
                  onClick={() => toggleSubMenu("inprogress")}
                >
                  <span>In Progress</span>
                  <span className="submenu-arrow">
                    {openSubMenu === "inprogress" ? "▾" : "▸"}
                  </span>
                </div>

                {openSubMenu === "inprogress" && (
                  <div className="submenu submenu-nested">
                    <NavLink to="/emsp-in-progress" className="submenu-item submenu-item--nested" onClick={onClose}>
                      Sessions
                    </NavLink>
                    <NavLink to="/emsp-in-progress-analysis" className="submenu-item submenu-item--nested" onClick={onClose}>
                      Analysis
                    </NavLink>
                  </div>
                )}
              </div>

              <div className="submenu-group">
                <div
                  className="submenu-item submenu-group-title"
                  onClick={() => toggleSubMenu("faulty")}
                >
                  <span>Faulty</span>
                  <span className="submenu-arrow">
                    {openSubMenu === "faulty" ? "▾" : "▸"}
                  </span>
                </div>

                {openSubMenu === "faulty" && (
                  <div className="submenu submenu-nested">
                    <NavLink to="/emsp-faulty-sessions" className="submenu-item submenu-item--nested" onClick={onClose}>
                      Sessions
                    </NavLink>
                    <NavLink to="/emsp-faulty-sesssion-analysis" className="submenu-item submenu-item--nested" onClick={onClose}>
                      Analysis
                    </NavLink>
                  </div>
                )}
              </div>

              <NavLink to="/emsp-CDR-Builder" className="submenu-item" onClick={onClose}>
                CDR Builder
              </NavLink>

            </div>
          )}
        </div>

        {/* CPO MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("cpo")}>
            CPO
          </div>

          {openModule === "cpo" && (
            <div className="submenu">
              <NavLink to="/cpo-CDR-Push" className="submenu-item" onClick={onClose}>
                CDR Push
              </NavLink>
            </div>
          )}
        </div>

        {/* USER REVIEW MODULE */}
        <div className="menu-module">
          <div className="module-title" onClick={() => toggleModule("user-review")}>
            Product
          </div>

          {openModule === "user-review" && (
            <div className="submenu">
              <NavLink to="/customer-management" onClick={onClose}>Customer Management</NavLink>
              <NavLink to="/user-segmentation" className="submenu-item" onClick={onClose}>User Segmentation</NavLink>
              <NavLink to="/user-review/pending-tickets" className="submenu-item" onClick={onClose}>
                Pending Tickets
              </NavLink>
              <NavLink to="/user-review/closed-tickets" className="submenu-item" onClick={onClose}>
                Closed Tickets
              </NavLink>
              <NavLink to="/user-review/review-analysis" className="submenu-item" onClick={onClose}>
                Review Analysis
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/analysis" onClick={onClose}>OCPI Analysis</NavLink>
        <NavLink to="/settings" onClick={onClose}>Settings</NavLink>

      </nav>
    </div>
  );
};

export default Sidebar;