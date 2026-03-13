import { NavLink } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/Logo.png";

const Sidebar = () => {
  const [openModule, setOpenModule] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const toggleModule = (module) => {
    setOpenModule(openModule === module ? null : module);
    // collapse sub-menus when parent collapses
    if (openModule === module) setOpenSubMenu(null);
  };

  const toggleSubMenu = (sub) => {
    setOpenSubMenu(openSubMenu === sub ? null : sub);
  };

  return (
    <div className="sidebar">

      <div className="sidebar-logo">
        <img src={logo} alt="logo" />
      </div>

      <nav>

        {/* Dashboard */}
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/station-explorer">Station Explorer</NavLink>
        <NavLink to="/fleet">Fleet</NavLink>

        {/* EMSP MODULE */}
        <div className="menu-module">

          <div
            className="module-title"
            onClick={() => toggleModule("emsp")}
          >
            EMSP
          </div>

          {openModule === "emsp" && (
            <div className="submenu">

              {/* ── In Progress (expandable sub-section) ── */}
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

                    <NavLink
                      to="/emsp-in-progress"
                      className="submenu-item submenu-item--nested"
                    >
                      Sessions
                    </NavLink>

                    <NavLink
                      to="/emsp-in-progress-analysis"
                      className="submenu-item submenu-item--nested"
                    >
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

                    <NavLink
                      to="/emsp-faulty-sessions"
                      className="submenu-item submenu-item--nested"
                    >
                      Sessions
                    </NavLink>

                    <NavLink
                      to="/emsp-faulty-sesssion-analysis"
                      className="submenu-item submenu-item--nested"
                    >
                      Analysis
                    </NavLink>

                  </div>
                )}

              </div>

              {/* ── CDR Builder ── */}
              <NavLink
                to="/emsp-CDR-Builder"
                className="submenu-item"
              >
                CDR Builder
              </NavLink>

            </div>
          )}

        </div>

        {/* CPO MODULE */}
        <div className="menu-module">

          <div
            className="module-title"
            onClick={() => toggleModule("cpo")}
          >
            CPO
          </div>

          {openModule === "cpo" && (
            <div className="submenu">
              <NavLink to="/cpo-CDR-Push" className="submenu-item">
                CDR Push
              </NavLink>
            </div>
          )}

        </div>

        {/* Other Modules */}
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/analysis">Analysis</NavLink>
        <NavLink to="/settings">Settings</NavLink>

      </nav>
    </div>
  );
};

export default Sidebar;
