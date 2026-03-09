import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import StationExplorer from "../pages/Station/StationExplorer";

import DashboardLayout from "../layouts/DashboardLayout";

import CDR_BUILDER from "../pages/CDR-Builder/CDR-Builder";
import CDR_PUSH from "../pages/CDR-Push/CDR-Push";

import InProgressSLA from "../pages/esmp-in_progress/InProgressSLA";
import InProgressAnalysis from "../pages/emps-in_progress_analysis/InProgressAnalysis";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={

            <Dashboard />
          }
        />

        <Route
          path="/station-explorer"
          element={
            <DashboardLayout>
              <StationExplorer />
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

        <Route
          path="/emsp-in-progress-analysis"
          element={
            <DashboardLayout>
              <InProgressAnalysis />
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

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;