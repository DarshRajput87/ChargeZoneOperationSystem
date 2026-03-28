import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import StationExplorer from "../pages/Station/StationExplorer";

import DashboardLayout from "../layouts/DashboardLayout";

import CDR_BUILDER from "../pages/CDR-Builder/CDR-Builder";
import CDR_PUSH from "../pages/CDR-Push/CDR-Push";

import InProgressSLA from "../pages/esmp-in_progress/InProgressSLA";
import InProgressAnalysis from "../pages/emps-in_progress_analysis/InProgressAnalysis";
import FaultySLA from "../pages/emps-faulty-session/FaultyDashboard";
import FleetForm from "../pages/fleet/FleetForm";
import FaultyAnalysis from "../pages/emsp-faulty-sesssion-analysis/FaultyAnalysis";
import ChargerSimulator from "../pages/ChargerSimulator/ChargerSimulator";
import OCPIAnalysis from "../pages/OCPI-Analysis/OCPI-Analysis";
import UserReview from "../pages/Helpdesk/HelpdeskPage";
import ClosedTickets from "../pages/Helpdesk/ClosedTickets";
import ReviewAnalysis from "../pages/Helpdesk/ReviewAnalysis";
import CustomerManagement from "../pages/Customer Management/CustomerManagement";

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
          path="/simulator"
          element={
            <DashboardLayout>
              <ChargerSimulator />
            </DashboardLayout>
          }
        />

        <Route
          path="/fleet"
          element={
            <DashboardLayout>
              <FleetForm />
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
          path="/emsp-faulty-sessions"
          element={
            <DashboardLayout>
              <FaultySLA />
            </DashboardLayout>
          }
        />

        <Route
          path="/emsp-faulty-sesssion-analysis"
          element={
            <DashboardLayout>
              <FaultyAnalysis />
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
          path="/user-review/pending-tickets"
          element={
            <DashboardLayout>
              <UserReview />
            </DashboardLayout>
          }
        />

        <Route
          path="/user-review/closed-tickets"
          element={
            <DashboardLayout>
              <ClosedTickets />
            </DashboardLayout>
          }
        />

        <Route
          path="/user-review/review-analysis"
          element={
            <DashboardLayout>
              <ReviewAnalysis />
            </DashboardLayout>
          }
        />

        <Route
          path="/analysis"
          element={
            <DashboardLayout>
              <OCPIAnalysis />
            </DashboardLayout>
          }
        />

        <Route
          path="/customer-management"
          element={
            <DashboardLayout>
              <CustomerManagement />
            </DashboardLayout>
          }
        />

        <Route
          path="/customer-management/:userId"
          element={
            <DashboardLayout>
              <CustomerManagement />
            </DashboardLayout>
          }
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;