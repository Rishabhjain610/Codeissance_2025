import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

// Define a default context value for better code clarity if contexts are not always available
// Assuming Sidebar is imported and functional

const BloodBankAppointments = () => {
  // 1. Context Hooks
  // Ensure that serverUrl and user are correctly provided by the contexts.
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  // 2. State Hooks
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  // State for temporary blood collection details for 'accept' action
  const [actionDetails, setActionDetails] = useState({ 
    appointmentId: null, 
    bloodType: 'A+', 
    units: 1 
  });
  const [showModal, setShowModal] = useState(false);

  // 3. Effect Hook to Fetch Data
  useEffect(() => {
    // Check if serverUrl is available before fetching
    if (serverUrl) {
      fetchAppointments();
    } else {
      console.error("serverUrl is not defined in AuthDataContext.");
      setLoading(false);
      toast.error("Configuration error: Server URL is missing.");
    }
  }, [serverUrl]); // Dependency on serverUrl to refetch if context loads late

  // 4. Data Fetching Function
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const endpoint = `${serverUrl}/api/bloodbank/appointments`;
      // console.log("Fetching from:", endpoint); // Debugging line

      const response = await axios.get(endpoint, { withCredentials: true });
      
      // FIX/IMPROVEMENT: Handle different server response structures
      let fetchedAppointments = [];
      if (response.data && Array.isArray(response.data.appointments)) {
        fetchedAppointments = response.data.appointments;
      } else if (response.data && Array.isArray(response.data)) {
         // Fallback for servers that return the array directly
         fetchedAppointments = response.data;
      } else {
         console.warn("API returned successful status but unexpected data structure:", response.data);
      }
      
      setAppointments(fetchedAppointments);
      
    } catch (error) {
      console.error("Error fetching appointments:", error.response?.data || error.message);
      toast.error(`Failed to load appointments: ${error.response?.data?.message || 'Check console for details.'}`);
      setAppointments([]); // Ensure the list is cleared on failure
    } finally {
      setLoading(false);
    }
  };

  // 5. Action Handlers
  
  // Handler for opening the modal to input collection details
  const handleOpenAcceptModal = (appointmentId, suggestedBloodType) => {
    setActionDetails({ 
        appointmentId, 
        bloodType: suggestedBloodType || 'A+', 
        units: 1 
    });
    setShowModal(true);
  };
  
  // Consolidated action logic after modal confirmation
  const handleAppointmentAction = async (appointmentId, action, bloodType = null, units = 1) => {
    setShowModal(false); // Close modal if open

    try {
      let endpoint = "";
      let payload = {};

      if (action === "accept") {
        endpoint = `${serverUrl}/api/bloodbank/appointment/${appointmentId}/complete`;
        payload = {
          bloodType: bloodType,
          unitsCollected: units,
          donationDate: new Date().toISOString()
        };
      } else if (action === "reject") {
        endpoint = `${serverUrl}/api/bloodbank/appointment/${appointmentId}/reject`;
        payload = {};
      }

      // console.log("Sending request to:", endpoint, "with payload:", payload);

      const response = await axios.put(endpoint, payload, { withCredentials: true });

      if (response.data) {
        toast.success(`Appointment ${action === "accept" ? "completed" : "rejected"} successfully`);
        
        // Update the bloodbank stock if accepted
        if (action === "accept" && bloodType) {
          await updateBloodStock(bloodType, units);
          // Check if blood is low and trigger ML model
          await checkLowBloodAndTriggerML(bloodType);
        }
        
        // Refresh appointments
        fetchAppointments();
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      console.error("Error details:", error.response?.data);
      toast.error(`Failed to ${action} appointment: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // Helper functions for stock and ML model (kept as is, assuming server-side logic is correct)
  
  const updateBloodStock = async (bloodType, units) => {
    try {
      // First get current stock
      const profileResponse = await axios.get(`${serverUrl}/api/bloodbank/profile`, 
        { withCredentials: true });
      
      if (profileResponse.data && profileResponse.data.bloodBank) {
        const currentStock = profileResponse.data.bloodBank.bloodStock || {};
        const newStock = { ...currentStock };
        const currentAmount = newStock[bloodType] || 0;
        const newAmount = Math.min(currentAmount + units, 50); // Max limit 50
        
        if (newAmount > currentAmount) {
          newStock[bloodType] = newAmount;
          
          // Update stock
          await axios.put(`${serverUrl}/api/bloodbank/stock`, {
            bloodStock: newStock
          }, { withCredentials: true });
          
          toast.success(`${units} units of ${bloodType} added to inventory (Total: ${newAmount})`);
        } else {
          toast.warning(`Inventory for ${bloodType} is at maximum capacity (50 units)`);
        }
      }
    } catch (error) {
      console.error("Error updating blood stock:", error);
      toast.error("Failed to update inventory");
    }
  };

  const checkLowBloodAndTriggerML = async (bloodType) => {
    try {
      const profileResponse = await axios.get(`${serverUrl}/api/bloodbank/profile`, 
        { withCredentials: true });
      
      if (profileResponse.data && profileResponse.data.bloodBank) {
        const currentStock = profileResponse.data.bloodBank.bloodStock || {};
        const currentAmount = currentStock[bloodType] || 0;
        
        // Check if blood is low (less than 10 units)
        if (currentAmount < 10) {
          toast.warning(`Low blood inventory for ${bloodType} (${currentAmount} units). Triggering ML model to find donors...`);
          
          // Trigger ML model to find most viable donors
          await triggerMLDonorSearch(bloodType);
        }
      }
    } catch (error) {
      console.error("Error checking blood levels:", error);
    }
  };

  const triggerMLDonorSearch = async (bloodType) => {
    try {
      // Get blood bank location
      const profileResponse = await axios.get(`${serverUrl}/api/bloodbank/profile`, 
        { withCredentials: true });
      
      if (profileResponse.data && profileResponse.data.bloodBank && profileResponse.data.bloodBank.location) {
        const location = profileResponse.data.bloodBank.location;
        
        // Call ML model in backpy
        const mlResponse = await axios.get(`http://localhost:5000/api/blood/find-donors`, {
          params: {
            blood_group: bloodType,
            lat: location.latitude,
            lon: location.longitude
          }
        });
        
        if (mlResponse.data && mlResponse.data.length > 0) {
          toast.success(`Found ${mlResponse.data.length} potential donors for ${bloodType}`);
          // console.log("ML Model Results:", mlResponse.data);
        } else {
          toast.info(`No eligible donors found for ${bloodType} at this time`);
        }
      }
    } catch (error) {
      console.error("Error triggering ML donor search:", error);
      toast.error("Failed to search for donors via ML model");
    }
  };

  // 6. Utility Functions
  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === "all") return true;
    // Note: The stats object uses 'rejected' to combine 'cancelled' and 'rejected' statuses.
    // Ensure this filter logic matches the status values from the backend.
    if (filter === "rejected") {
      return appointment.status === "rejected" || appointment.status === "cancelled";
    }
    // 'cancelled' filter here should probably map to the 'rejected' bucket for UI consistency
    if (filter === "cancelled") {
      return appointment.status === "rejected" || appointment.status === "cancelled";
    }
    return appointment.status === filter;
  });

  const getAppointmentStats = () => {
    return {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === "scheduled").length,
      completed: appointments.filter(a => a.status === "completed").length,
      // Combining cancelled and rejected for the UI stats card
      rejected: appointments.filter(a => a.status === "cancelled" || a.status === "rejected").length
    };
  };

  const stats = getAppointmentStats();

  // 7. Loading State Render
  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  // 8. Main Component Render
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-600 text-lg mt-1">Manage blood donation appointments</p>
              </div>
            </div>
            <button
              onClick={fetchAppointments}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[
              { key: "all", label: "All", count: stats.total },
              { key: "scheduled", label: "Scheduled", count: stats.scheduled },
              { key: "completed", label: "Completed", count: stats.completed },
              { key: "rejected", label: "Rejected", count: stats.rejected } // Use 'rejected' key to match stats
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  filter === tab.key 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className="bg-gray-200 text-xs px-2 py-1 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Appointment Requests</h2>
            <p className="text-sm text-gray-600 mt-1">Review and manage blood donation appointments</p>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Appointments</h4>
              <p className="text-gray-600">No {filter === 'all' ? '' : filter} appointments found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <div key={appointment._id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
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
                            {new Date(appointment.date).toLocaleString()}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {appointment.userId?.phone || 'No phone'}
                          </div>
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                            {/* Assuming bloodGroup is available on userId object, defaulting to requested type if user data is incomplete */}
                            {appointment.userId?.bloodGroup || appointment.type || 'Unknown'} 
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 capitalize">
                              Type: {appointment.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          appointment.status === "completed" ? "bg-green-400" : 
                          appointment.status === "scheduled" ? "bg-blue-400" : 
                          "bg-red-400"
                        }`}></span>
                        {appointment.status}
                      </span>

                      {appointment.status === "scheduled" && (
                        <div className="flex items-center space-x-2">
                          <button
                            // Use the modal opener instead of direct action
                            onClick={() => handleOpenAcceptModal(appointment._id, appointment.userId?.bloodGroup || 'A+')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept
                          </button>
                          <button
                            onClick={() => handleAppointmentAction(appointment._id, "reject")}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      )}

                      {appointment.status === "completed" && appointment.donationDate && (
                        <div className="text-xs text-gray-500">
                          <div>Collected: {appointment.unitsCollected} units</div>
                          <div>On: {new Date(appointment.donationDate).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 9. Acceptance Modal (New Addition for Better UX) */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Confirm Donation</h3>
            <p className="text-gray-600 mb-6">Enter the actual details of the blood collected.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type Collected</label>
              <select
                value={actionDetails.bloodType}
                onChange={(e) => setActionDetails({...actionDetails, bloodType: e.target.value})}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Units Collected</label>
              <input
                type="number"
                min="1"
                max="5"
                value={actionDetails.units}
                onChange={(e) => setActionDetails({...actionDetails, units: parseInt(e.target.value) || 1})}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAppointmentAction(
                    actionDetails.appointmentId, 
                    "accept", 
                    actionDetails.bloodType, 
                    actionDetails.units
                )}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirm Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankAppointments;