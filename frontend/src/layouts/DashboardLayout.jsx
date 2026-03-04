import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-section">
        <Topbar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default DashboardLayout;