import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const BloodBankDashboard = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [bloodStock, setBloodStock] = useState({
    "A+": 0, "A-": 0, "B+": 0, "B-": 0,
    "AB+": 0, "AB-": 0, "O+": 0, "O-": 0
  });
  const [appointments, setAppointments] = useState([]);
  const [bloodRequests, setBloodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    fetchBloodBankData();
  }, []);

  const fetchBloodBankData = async () => {
    try {
      const [profileRes, appointmentsRes] = await Promise.all([
        axios.get(`${serverUrl}/api/bloodbank/profile`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/bloodbank/appointments`, { withCredentials: true })
      ]);

      if (profileRes.data && profileRes.data.bloodBank) {
        setBloodStock(profileRes.data.bloodBank.bloodStock || bloodStock);
      }

      if (appointmentsRes.data && appointmentsRes.data.appointments) {
        setAppointments(appointmentsRes.data.appointments);
      }
    } catch (error) {
      console.error("Error fetching blood bank data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId, action, bloodType = null, units = 1) => {
    try {
      if (action === "accept" && bloodType) {
        // Update blood stock
        const newStock = { ...bloodStock };
        newStock[bloodType] = (newStock[bloodType] || 0) + units;
        
        await axios.put(`${serverUrl}/api/bloodbank/stock`, {
          bloodStock: newStock
        }, { withCredentials: true });

        setBloodStock(newStock);
        
        // Mark appointment as completed with donation date
        await axios.put(`${serverUrl}/api/appointment/${appointmentId}/complete`, {
          bloodType,
          unitsCollected: units,
          donationDate: new Date().toISOString()
        }, { withCredentials: true });

        toast.success(`Appointment accepted! ${units} units of ${bloodType} added to stock`);
      } else if (action === "reject") {
        await axios.put(`${serverUrl}/api/appointment/${appointmentId}/reject`, {}, 
          { withCredentials: true });
        toast.success("Appointment rejected");
      }
      
      // Refresh appointments
      fetchBloodBankData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment");
    }
  };

  const fetchBloodRequests = async () => {
    try {
      // This would be a new endpoint to get pending blood requests for this blood bank
      const response = await axios.get(`${serverUrl}/api/bloodbank/requests`, 
        { withCredentials: true });
      if (response.data && response.data.requests) {
        setBloodRequests(response.data.requests);
      }
    } catch (error) {
      console.error("Error fetching blood requests:", error);
      toast.error("Failed to load blood requests");
    }
  };

  const handleBloodRequest = async (requestId, action, bloodType, quantity) => {
    try {
      if (action === "fulfill") {
        const currentStock = bloodStock[bloodType] || 0;
        if (currentStock >= quantity) {
          // Fulfill from stock
          const newStock = { ...bloodStock };
          newStock[bloodType] = currentStock - quantity;
          
          await axios.put(`${serverUrl}/api/bloodbank/stock`, {
            bloodStock: newStock
          }, { withCredentials: true });

          await axios.put(`${serverUrl}/api/request/fulfill/${requestId}`, {
            fulfilledBy: "bloodbank",
            bloodBankId: user._id
          }, { withCredentials: true });

          setBloodStock(newStock);
          toast.success(`Request fulfilled! ${quantity} units of ${bloodType} provided`);
        } else {
          toast.error(`Insufficient stock. Only ${currentStock} units available`);
          return;
        }
      } else if (action === "find_donors") {
        // Call ML API to find donors
        try {
          const mlResponse = await axios.get(`http://localhost:5000/api/blood/find-donors`, {
            params: {
              blood_group: bloodType,
              lat: user.location?.latitude || 28.6139,
              lon: user.location?.longitude || 77.2090
            }
          });

          if (mlResponse.data && mlResponse.data.length > 0) {
            // Update the request with ML donors
            await axios.put(`${serverUrl}/api/request/add-donors/${requestId}`, {
              donors: mlResponse.data,
              source: "ml_model"
            }, { withCredentials: true });
            
            toast.success(`Found ${mlResponse.data.length} potential donors via ML model`);
          } else {
            toast.warning("No suitable donors found in the area");
          }
        } catch (mlError) {
          console.error("ML API Error:", mlError);
          toast.error("ML service unavailable. Using fallback donors");
          
          // Fallback donors
          const fallbackDonors = [
            { name: "ML Donor 1", contact_number: "9999990001", latitude: 28.61, longitude: 77.21, likelihood: 0.85, distance_km: 2.5 },
            { name: "ML Donor 2", contact_number: "9999990002", latitude: 28.62, longitude: 77.22, likelihood: 0.78, distance_km: 3.2 },
            { name: "ML Donor 3", contact_number: "9999990003", latitude: 28.63, longitude: 77.23, likelihood: 0.72, distance_km: 4.1 }
          ];
          
          await axios.put(`${serverUrl}/api/request/add-donors/${requestId}`, {
            donors: fallbackDonors,
            source: "fallback"
          }, { withCredentials: true });
        }
      }
      
      // Refresh requests
      fetchBloodRequests();
    } catch (error) {
      console.error("Error handling blood request:", error);
      toast.error("Failed to process request");
    }
  };

  const getBloodTypeIcon = (type) => {
    const colors = {
      "A+": "text-blue-600 bg-blue-50", "A-": "text-blue-800 bg-blue-100",
      "B+": "text-purple-600 bg-purple-50", "B-": "text-purple-800 bg-purple-100",
      "AB+": "text-green-600 bg-green-50", "AB-": "text-green-800 bg-green-100",
      "O+": "text-red-600 bg-red-50", "O-": "text-red-800 bg-red-100"
    };
    return colors[type] || "text-gray-600 bg-gray-50";
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { status: "Empty", color: "text-red-600 bg-red-50 border-red-200" };
    if (quantity < 5) return { status: "Low", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
    if (quantity < 15) return { status: "Medium", color: "text-blue-600 bg-blue-50 border-blue-200" };
    return { status: "High", color: "text-green-600 bg-green-50 border-green-200" };
  };

  useEffect(() => {
    if (activeTab === "requests") {
      fetchBloodRequests();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Blood Bank Dashboard</h1>
              <p className="text-gray-600 text-lg mt-1">Manage appointments, requests, and inventory</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[
              { key: "dashboard", label: "Dashboard", icon: "📊" },
              { key: "appointments", label: "Appointments", icon: "📅" },
              { key: "requests", label: "Blood Requests", icon: "🩸" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.key 
                    ? 'bg-white text-red-600 shadow-sm' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Blood Stock Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Blood Inventory</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(bloodStock).map(([bloodType, quantity]) => {
                  const stockStatus = getStockStatus(quantity);
                  return (
                    <div key={bloodType} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getBloodTypeIcon(bloodType)}`}>
                          {bloodType}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900 mb-1">{quantity}</div>
                        <div className="text-sm text-gray-500">units available</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === "pending").length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900">{Object.values(bloodStock).reduce((a, b) => a + b, 0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-100">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(bloodStock).filter(q => q < 5).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Appointment Requests</h2>
              <p className="text-sm text-gray-600 mt-1">Review and manage blood donation appointments</p>
            </div>
            
            {appointments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Appointments</h4>
                <p className="text-gray-600">No appointment requests at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {appointments.map((appointment, index) => (
                  <div key={appointment._id || index} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                              {appointment.userId?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-lg font-semibold text-gray-900">
                            {appointment.userId?.name || 'Unknown User'}
                          </h5>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(appointment.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {appointment.userId?.phone || 'No phone'}
                            </div>
                            <div className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                              {appointment.userId?.bloodGroup || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {appointment.status === "pending" && (
                        <div className="flex items-center space-x-3">
                          <select 
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                              const [bloodType, units] = e.target.value.split(',');
                              if (bloodType && units) {
                                handleAppointmentAction(appointment._id, "accept", bloodType, parseInt(units));
                              }
                            }}
                          >
                            <option value="">Select donation</option>
                            <option value={`${appointment.userId?.bloodGroup || 'A+'},1`}>
                              {appointment.userId?.bloodGroup || 'A+'} - 1 unit
                            </option>
                          </select>
                          <button
                            onClick={() => handleAppointmentAction(appointment._id, "reject")}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      
                      {appointment.status === "completed" && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                          Completed
                        </span>
                      )}
                      
                      {appointment.status === "rejected" && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blood Requests Tab */}
        {activeTab === "requests" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Hospital Blood Requests</h2>
              <p className="text-sm text-gray-600 mt-1">Fulfill requests or find donors using ML</p>
            </div>
            
            {bloodRequests.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Blood Requests</h4>
                <p className="text-gray-600">No pending blood requests from hospitals.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bloodRequests.map((request, index) => (
                  <div key={request._id || index} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-lg font-semibold text-gray-900">
                            {request.hospitalName || 'Unknown Hospital'}
                          </h5>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getBloodTypeIcon(request.bloodGroup)}`}>
                            {request.bloodGroup}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            {request.quantity} units needed
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                            Available: {bloodStock[request.bloodGroup] || 0} units
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {(bloodStock[request.bloodGroup] || 0) >= request.quantity ? (
                          <button
                            onClick={() => handleBloodRequest(request._id, "fulfill", request.bloodGroup, request.quantity)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Fulfill Request
                          </button>
                        ) : (
                          <span className="text-red-600 text-sm font-medium px-3 py-2 bg-red-50 rounded border border-red-200">
                            Insufficient Stock
                          </span>
                        )}
                        
                        <button
                          onClick={() => handleBloodRequest(request._id, "find_donors", request.bloodGroup, request.quantity)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Find Donors (ML)
                        </button>
                      </div>
                    </div>
                    
                    {/* ML Donors Section */}
                    {request.mlDonors && request.mlDonors.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h6 className="text-sm font-semibold text-blue-900 mb-3">AI-Recommended Donors:</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {request.mlDonors.slice(0, 4).map((donor, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{donor.name || `Donor ${idx + 1}`}</div>
                                  <div className="text-xs text-gray-600">
                                    📞 {donor.contact_number || 'No phone'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    📍 {donor.distance_km ? `${donor.distance_km.toFixed(1)}km away` : 'Location unknown'}
                                    {donor.likelihood && (
                                      <span className="ml-2 text-blue-600">
                                        🎯 {(donor.likelihood * 100).toFixed(0)}% likely
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    // Contact donor functionality
                                    if (donor.contact_number) {
                                      window.open(`tel:${donor.contact_number}`);
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                                >
                                  Contact
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BloodBankDashboard;