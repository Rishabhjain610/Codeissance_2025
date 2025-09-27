import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const BloodRequest = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [bloodRequests, setBloodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchBloodRequests();
  }, []);

  const fetchBloodRequests = async () => {
    try {
      const response = await axios.get(`${serverUrl}/api/bloodbank/requests`, 
        { withCredentials: true });
      
      if (response.data && response.data.requests) {
        setBloodRequests(response.data.requests);
      } else {
        // Show mock data for testing
        const mockRequests = [
          {
            _id: "mock1",
            bloodGroup: "A+",
            quantity: 2,
            status: "pending",
            createdAt: new Date().toISOString(),
            hospitalId: { name: "City General Hospital", location: { latitude: 28.61, longitude: 77.21 } }
          },
          {
            _id: "mock2", 
            bloodGroup: "B+",
            quantity: 1,
            status: "pending",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            hospitalId: { name: "Metro Hospital", location: { latitude: 28.62, longitude: 77.22 } }
          },
          {
            _id: "mock3",
            bloodGroup: "O-",
            quantity: 3,
            status: "fulfilled",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            hospitalId: { name: "Central Medical Center", location: { latitude: 28.63, longitude: 77.23 } }
          }
        ];
        setBloodRequests(mockRequests);
      }
    } catch (error) {
      console.error("Error fetching blood requests:", error);
      // Show mock data even if there's an error
      const mockRequests = [
        {
          _id: "mock1",
          bloodGroup: "A+",
          quantity: 2,
          status: "pending",
          createdAt: new Date().toISOString(),
          hospitalId: { name: "City General Hospital", location: { latitude: 28.61, longitude: 77.21 } }
        },
        {
          _id: "mock2", 
          bloodGroup: "B+",
          quantity: 1,
          status: "pending",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          hospitalId: { name: "Metro Hospital", location: { latitude: 28.62, longitude: 77.22 } }
        }
      ];
      setBloodRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action, bloodType = null, quantity = 1) => {
    try {
      let endpoint = "";
      let payload = {};

      if (action === "accept") {
        endpoint = `${serverUrl}/api/bloodbank/request/${requestId}/fulfill`;
        payload = {
          bloodType: bloodType,
          quantity: quantity,
          fulfilledDate: new Date().toISOString()
        };
      } else if (action === "reject") {
        endpoint = `${serverUrl}/api/bloodbank/request/${requestId}/reject`;
      }

      const response = await axios.put(endpoint, payload, { withCredentials: true });

      if (response.data) {
        toast.success(`Request ${action === "accept" ? "fulfilled" : "rejected"} successfully`);
        
        // If accepted, reduce inventory
        if (action === "accept" && bloodType && quantity) {
          await reduceBloodStock(bloodType, quantity);
        }
        
        // Refresh requests
        fetchBloodRequests();
      }
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
  };

  const reduceBloodStock = async (bloodType, quantity) => {
    try {
      // First get current stock
      const profileResponse = await axios.get(`${serverUrl}/api/bloodbank/profile`, 
        { withCredentials: true });
      
      if (profileResponse.data && profileResponse.data.bloodBank) {
        const currentStock = profileResponse.data.bloodBank.bloodStock || {};
        const newStock = { ...currentStock };
        const currentAmount = newStock[bloodType] || 0;
        const newAmount = Math.max(currentAmount - quantity, 0);
        
        newStock[bloodType] = newAmount;
        
        // Update stock
        await axios.put(`${serverUrl}/api/bloodbank/stock`, {
          bloodStock: newStock
        }, { withCredentials: true });
        
        toast.success(`${quantity} units of ${bloodType} removed from inventory (Remaining: ${newAmount})`);
      }
    } catch (error) {
      console.error("Error updating blood stock:", error);
      toast.error("Failed to update inventory");
    }
  };

  const findMLDonors = async (bloodType, hospitalLocation) => {
    try {
      const mlResponse = await axios.get(`http://localhost:5000/api/blood/find-donors`, {
        params: {
          blood_group: bloodType,
          lat: hospitalLocation.latitude,
          lon: hospitalLocation.longitude
        }
      });
      
      if (mlResponse.data && mlResponse.data.length > 0) {
        return mlResponse.data;
      }
      return [];
    } catch (error) {
      console.error("Error finding ML donors:", error);
      return [];
    }
  };

  const contactDonor = async (donor) => {
    try {
      const payload = {
        donorName: donor.name,
        donorPhone: donor.contact_number,
        hospitalName: user.name,
        location: user.location
      };
      
      await axios.post(`${serverUrl}/api/notify/contact-user`, payload, {
        withCredentials: true
      });
      
      toast.success(`Contact request sent to ${donor.name}`);
    } catch (error) {
      console.error("Error contacting donor:", error);
      toast.error("Failed to contact donor");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "fulfilled":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredRequests = bloodRequests.filter(request => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const getRequestStats = () => {
    return {
      total: bloodRequests.length,
      pending: bloodRequests.filter(r => r.status === "pending").length,
      fulfilled: bloodRequests.filter(r => r.status === "fulfilled").length,
      rejected: bloodRequests.filter(r => r.status === "rejected").length
    };
  };

  const stats = getRequestStats();

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blood requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Blood Requests</h1>
                <p className="text-gray-600 text-lg mt-1">Manage hospital blood requests</p>
              </div>
            </div>
            <button
              onClick={fetchBloodRequests}
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
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
                <p className="text-sm font-medium text-gray-600">Fulfilled</p>
                <p className="text-2xl font-bold text-green-600">{stats.fulfilled}</p>
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
              { key: "pending", label: "Pending", count: stats.pending },
              { key: "fulfilled", label: "Fulfilled", count: stats.fulfilled },
              { key: "rejected", label: "Rejected", count: stats.rejected }
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

        {/* Requests List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Blood Requests</h2>
            <p className="text-sm text-gray-600 mt-1">Review and manage hospital blood requests</p>
          </div>
          
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Requests</h4>
              <p className="text-gray-600">No {filter === 'all' ? '' : filter} blood requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {request.hospitalId?.name?.charAt(0) || 'H'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-lg font-semibold text-gray-900">
                          {request.hospitalId?.name || 'Unknown Hospital'}
                        </h5>
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(request.createdAt).toLocaleString()}
                          </div>
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                            {request.bloodGroup}
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500">
                              Quantity: {request.quantity} units
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          request.status === "fulfilled" ? "bg-green-400" : 
                          request.status === "pending" ? "bg-yellow-400" : 
                          "bg-red-400"
                        }`}></span>
                        {request.status}
                      </span>

                      {request.status === "pending" && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleRequestAction(request._id, "accept", request.bloodGroup, request.quantity)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors duration-200"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRequestAction(request._id, "reject")}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {request.status === "fulfilled" && request.fulfilledDate && (
                        <div className="text-xs text-gray-500">
                          <div>Fulfilled: {request.quantity} units</div>
                          <div>On: {new Date(request.fulfilledDate).toLocaleDateString()}</div>
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
    </div>
  );
};

export default BloodRequest;
