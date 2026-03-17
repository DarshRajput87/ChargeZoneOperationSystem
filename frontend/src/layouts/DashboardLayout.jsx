import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-container">
      {/* Overlay backdrop — closes sidebar when tapped on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-section">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default DashboardLayout;