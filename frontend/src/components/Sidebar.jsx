import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="logo" />
      </div>

      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/station-explorer">Station Explorer</NavLink>
        <NavLink to="/emsp-in-progress">EMSP - In Progress</NavLink>
        <NavLink to="/emsp-CDR-Builder">EMSP - CDR-Builder</NavLink>
        <NavLink to="/cpo-CDR-Push">CPO - CDR-Push</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/analysis">Analysis</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;