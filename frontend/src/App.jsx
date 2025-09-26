import React, { useState, useEffect, useContext } from "react";
import "./App.css";
import UserDashboard from "../pages/UserDashboard.jsx";
import HospitalDashboard from "../pages/HospitalDashboard.jsx";
import BloodBankDashboard from "../pages/BloodBankDashboard.jsx";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
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
const App = () => {
  const { user, loading } = useContext(UserDataContext);
  const { serverUrl } = useContext(AuthDataContext);
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
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <div>Loading...</div>
            ) : (
              <LandingPage />
            )
          }
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
        {/* <Route path="/dashboard/user" element={<UserDashboard />} />
        <Route path="/dashboard/hospital" element={<HospitalDashboard />} />
        <Route path="/dashboard/bloodbank" element={<BloodBankDashboard />} /> */}
        <Route
          path="/dashboard/user"
          element={
            loading ? (
              <div>Loading...</div>
            ) : user != null ? (
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
            ) : user != null ? (
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
            ) : user != null ? (
              <BloodBankDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </>
  );
};

export default App;
