import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import StationExplorer from "../pages/Station/StationExplorer";
import DashboardLayout from "../layouts/DashboardLayout";
import CDR_BUILDER from "../pages/CDR-Builder/CDR-Builder";
import CDR_PUSH from "../pages/CDR-Push/CDR-Push";
import InProgressSLA from "../pages/esmp-in_progress/InProgressSLA";
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* THIS IS IMPORTANT */}
        <Route
          path="/station-explorer"
          element={
            <DashboardLayout>
              <StationExplorer />
            </DashboardLayout>
          }
        />
         <Route
          path="/emsp-CDR-Builder"
          element={
            <DashboardLayout>
              <CDR_BUILDER />
            </DashboardLayout>
          }
        />
        <Route
          path="/cpo-CDR-Push"
          element={
            <DashboardLayout>
              <CDR_PUSH />
            </DashboardLayout>
          }
        />
        <Route
          path="/emsp-in-progress"
          element={
            <DashboardLayout>
              <InProgressSLA />
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;