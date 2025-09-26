import React from "react";
import Sidebar from "../components/Sidebar";
const BloodBankDashboard = () => (
  <div className="min-h-screen flex">
    <Sidebar role="BloodBank" />
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 ml-64">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Blood Bank Dashboard</h1>
      {/* Add blood bank-specific UI here */}
    </div>
  </div>
);
export default BloodBankDashboard;