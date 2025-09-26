import React, { useState, useEffect, useContext } from "react";
import "./App.css";
import UserDashboard from "../pages/UserDashboard.jsx";
import HospitalDashboard from "../pages/HospitalDashboard.jsx";
import BloodBankDashboard from "../pages/BloodBankDashboard.jsx";
import RequestBloodPage from "../pages/RequestBloodPage.jsx";
import RequestOrganPage from "../pages/RequestOrganPage.jsx";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation
} from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UserDataContext } from "../context/UserContext.jsx";
import { AuthDataContext } from "../context/AuthContext.jsx";

// Component to handle conditional navbar rendering
const AppContent = () => {
  const { user, loading } = useContext(UserDataContext);
  const { serverUrl } = useContext(AuthDataContext);
  const location = useLocation();

  // Define routes where navbar should be hidden
  const hideNavbarRoutes = [
    '/dashboard/bloodbank',
    '/bloodbank/appointments', 
    '/bloodbank/requests', 
    '/bloodbank/inventory',
    '/dashboard/hospital',
    '/dashboard/user',
  ];
  
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      <ToastContainer
        position="top-left"
        hideProgressBar={true}
        autoClose={1000}
        theme="dark"
        toastStyle={{
          background: "#18181b",
          color: "#fafafa",
          borderRadius: "10px",
          fontWeight: "500",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      />
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={loading ? <div>Loading...</div> : <LandingPage />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/about"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user != null ? (
              <LandingPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/contact"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user != null ? (
              <LandingPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/dashboard/user"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "NormalUser" ? (
              <UserDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/hospital"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "Hospital" ? (
              <HospitalDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/bloodbank"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "BloodBank" ? (
              <BloodBankDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        {/* Blood Bank specific routes */}
        <Route
          path="/bloodbank/appointments"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "BloodBank" ? (
              <BloodBankDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bloodbank/requests"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "BloodBank" ? (
              <BloodBankDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bloodbank/inventory"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user && user.role === "BloodBank" ? (
              <BloodBankDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/request-blood" element={<RequestBloodPage />} />
        <Route path="/request-organ" element={<RequestOrganPage />} />
      </Routes>
    </>
  );
};

const App = () => {
  return <AppContent />;
};

export default App;