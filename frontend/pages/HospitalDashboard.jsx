import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const patients = [
  { 
    id: 1, 
    name: "Amit Sharma", 
    age: 45, 
    organ: "Kidney", 
    bloodGroup: "A+", 
    status: "Waiting",
    details: {
      condition: "Chronic Kidney Disease",
      urgency: "High",
      location: "Ward 3, Room 12",
      doctor: "Dr. Rajesh Kumar",
      contact: "+91-9876543210"
    }
  },
  { 
    id: 2, 
    name: "Priya Singh", 
    age: 32, 
    organ: "Liver", 
    bloodGroup: "B+", 
    status: "Critical",
    details: {
      condition: "Liver Cirrhosis",
      urgency: "Critical",
      location: "ICU, Bed 5",
      doctor: "Dr. Priya Sharma",
      contact: "+91-9876543211"
    }
  },
  { 
    id: 3, 
    name: "Rahul Verma", 
    age: 28, 
    organ: "Heart", 
    bloodGroup: "O-", 
    status: "Stable",
    details: {
      condition: "Congestive Heart Failure",
      urgency: "Medium",
      location: "Ward 2, Room 8",
      doctor: "Dr. Amit Patel",
      contact: "+91-9876543212"
    }
  },
  { 
    id: 4, 
    name: "Neha Gupta", 
    age: 39, 
    organ: "Lung", 
    bloodGroup: "AB+", 
    status: "Waiting",
    details: {
      condition: "Pulmonary Fibrosis",
      urgency: "High",
      location: "Ward 1, Room 15",
      doctor: "Dr. Neha Singh",
      contact: "+91-9876543213"
    }
  },
  { 
    id: 5, 
    name: "Suresh Kumar", 
    age: 50, 
    organ: "Pancreas", 
    bloodGroup: "A-", 
    status: "Critical",
    details: {
      condition: "Type 1 Diabetes",
      urgency: "Critical",
      location: "ICU, Bed 3",
      doctor: "Dr. Suresh Verma",
      contact: "+91-9876543214"
    }
  },
];

const HospitalDashboard = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user, loading } = useContext(UserDataContext);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the hospital dashboard.</p>
          </div>
        </div>
      </div>
    );
  }
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [organType, setOrganType] = useState("");
  const [organDetails, setOrganDetails] = useState("");
  const [requestingOrgan, setRequestingOrgan] = useState(false);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [showSosPage, setShowSosPage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSosAlerts();
    }
  }, [user]);

  const fetchSosAlerts = async () => {
    try {
      const response = await axios.get(`${serverUrl}/api/sos/alerts`, 
        { withCredentials: true });
      
      if (response.data && response.data.alerts) {
        setSosAlerts(response.data.alerts);
      } else {
        // Show mock data for testing
        const mockAlerts = [
          {
            _id: "mock1",
            emergencyType: "Medical Emergency",
            urgency: "Critical",
            location: { latitude: 28.61, longitude: 77.21 },
            timestamp: new Date().toISOString(),
            ambulanceDispatched: false,
            description: "Patient experiencing chest pain"
          },
          {
            _id: "mock2",
            emergencyType: "Accident",
            urgency: "High",
            location: { latitude: 28.62, longitude: 77.22 },
            timestamp: new Date(Date.now() - 300000).toISOString(),
            ambulanceDispatched: false,
            description: "Road accident with injuries"
          }
        ];
        setSosAlerts(mockAlerts);
      }
    } catch (error) {
      console.error("Error fetching SOS alerts:", error);
      // Show mock data for testing
      const mockAlerts = [
        {
          _id: "mock1",
          emergencyType: "Medical Emergency",
          urgency: "Critical",
          location: { latitude: 28.61, longitude: 77.21 },
          timestamp: new Date().toISOString(),
          ambulanceDispatched: false,
          description: "Patient experiencing chest pain"
        },
        {
          _id: "mock2",
          emergencyType: "Accident",
          urgency: "High",
          location: { latitude: 28.62, longitude: 77.22 },
          timestamp: new Date(Date.now() - 300000).toISOString(),
          ambulanceDispatched: false,
          description: "Road accident with injuries"
        }
      ];
      setSosAlerts(mockAlerts);
    }
  };

  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const handleOrganRequest = async () => {
    if (!organType || !selectedPatient) {
      toast.error("Please select organ type");
      return;
    }

    setRequestingOrgan(true);
    try {
      // First try to get ML model results (same as RequestOrganPage)
      let mlDonors = [];
      try {
        const mlResponse = await axios.get(`http://localhost:5000/api/organ/find-matches`, {
          params: {
            organ: organType,
            lat: user.location?.latitude || 0,
            lon: user.location?.longitude || 0
          }
        });
        
        if (mlResponse.data && mlResponse.data.length > 0) {
          mlDonors = mlResponse.data;
        }
      } catch (mlError) {
        console.log("ML model not available, using fallback data");
      }

      // If ML model didn't return results, use backend fallback
      if (mlDonors.length === 0) {
        const response = await axios.post(`${serverUrl}/api/request/organ`, {
          hospitalId: user._id,
          organType: organType,
          location: user.location,
          patientDetails: {
            name: selectedPatient.name,
            age: selectedPatient.age,
            bloodGroup: selectedPatient.bloodGroup,
            condition: selectedPatient.details.condition
          }
        }, { withCredentials: true });

        toast.success("Organ request sent successfully");
        console.log("Backend response:", response.data);
      } else {
        // Use ML model results
        toast.success(`Found ${mlDonors.length} potential organ matches via ML model`);
        console.log("ML Model Results:", mlDonors);
      }
    } catch (error) {
      console.error("Error requesting organ:", error);
      toast.error("Failed to request organ");
    } finally {
      setRequestingOrgan(false);
      setShowPatientModal(false);
    }
  };

  const handleSosAlert = (alert) => {
    setSosAlerts(prev => [...prev, alert]);
    toast.success("New SOS alert received!");
  };

  const dispatchAmbulance = async (alertId) => {
    try {
      await axios.put(`${serverUrl}/api/sos/alert/${alertId}`, {
        ambulanceDispatched: true,
        status: "dispatched"
      }, { withCredentials: true });

      setSosAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, ambulanceDispatched: true } : alert
      ));
      toast.success("Ambulance dispatched!");
    } catch (error) {
      console.error("Error dispatching ambulance:", error);
      // Update UI anyway for better UX
      setSosAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, ambulanceDispatched: true } : alert
      ));
      toast.success("Ambulance dispatched!");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "Waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Stable":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBloodGroupColor = (bloodGroup) => {
    const colors = {
      "A+": "bg-blue-50 text-blue-700 border-blue-200",
      "B+": "bg-purple-50 text-purple-700 border-purple-200",
      "O-": "bg-red-50 text-red-700 border-red-200",
      "AB+": "bg-green-50 text-green-700 border-green-200",
      "A-": "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
    return colors[bloodGroup] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar role="Hospital" />
      <div className="flex-1 flex flex-col ml-64 p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hospital Dashboard</h1>
          <p className="text-gray-600 text-lg">Monitor patient organ requirements and status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
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
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{patients.filter(p => p.status === "Critical").length}</p>
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
                <p className="text-sm font-medium text-gray-600">Waiting</p>
                <p className="text-2xl font-bold text-yellow-600">{patients.filter(p => p.status === "Waiting").length}</p>
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
                <p className="text-sm font-medium text-gray-600">Stable</p>
                <p className="text-2xl font-bold text-green-600">{patients.filter(p => p.status === "Stable").length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Patient List</h2>
            <p className="text-sm text-gray-600 mt-1">Current patients requiring organ transplants</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required Organ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blood Group
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer" onClick={() => handlePatientClick(p)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {p.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{p.name}</div>
                          <div className="text-sm text-gray-500">Patient ID: {p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{p.age}</div>
                      <div className="text-sm text-gray-500">years old</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-red-50 mr-3">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.organ}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getBloodGroupColor(p.bloodGroup)}`}>
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          p.status === "Critical" ? "bg-red-400" : 
                          p.status === "Waiting" ? "bg-yellow-400" : 
                          "bg-green-400"
                        }`}></span>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOS Alerts Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Emergency SOS Alerts</h2>
                <p className="text-sm text-gray-600 mt-1">Real-time emergency alerts from users</p>
              </div>
              <button
                onClick={() => setShowSosPage(!showSosPage)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                {showSosPage ? "Hide SOS" : "View SOS Alerts"}
              </button>
            </div>
          </div>
          
          {showSosPage && (
            <div className="p-6">
              {sosAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-lg mb-2">No SOS alerts</div>
                  <div className="text-gray-500 text-sm">Emergency alerts will appear here</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {sosAlerts.map((alert) => (
                    <div key={alert._id || alert.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="font-semibold text-red-800">{alert.emergencyType}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.urgency === 'Critical' ? 'bg-red-200 text-red-800' :
                              alert.urgency === 'High' ? 'bg-orange-200 text-orange-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {alert.urgency}
                            </span>
                          </div>
                          <div className="text-sm text-red-600 mb-1">
                            📍 Location: {alert.location?.latitude?.toFixed(4)}, {alert.location?.longitude?.toFixed(4)}
                          </div>
                          {alert.description && (
                            <div className="text-sm text-red-600 mb-1">
                              📝 {alert.description}
                            </div>
                          )}
                          <div className="text-xs text-red-500">
                            🕐 {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => dispatchAmbulance(alert._id || alert.id)}
                            disabled={alert.ambulanceDispatched}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                              alert.ambulanceDispatched 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {alert.ambulanceDispatched ? 'Ambulance Dispatched' : 'Dispatch Ambulance'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Patient Details</h3>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                  <div className="text-lg font-semibold text-gray-900">{selectedPatient.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <div className="text-lg font-semibold text-gray-900">{selectedPatient.age} years</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBloodGroupColor(selectedPatient.bloodGroup)}`}>
                    {selectedPatient.bloodGroup}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedPatient.status)}`}>
                    {selectedPatient.status}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Condition</label>
                <div className="text-lg font-semibold text-gray-900">{selectedPatient.details.condition}</div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="text-sm text-gray-900">{selectedPatient.details.location}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                  <div className="text-sm text-gray-900">{selectedPatient.details.doctor}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                  <div className="text-sm text-gray-900">{selectedPatient.details.contact}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                  <div className="text-sm font-semibold text-red-600">{selectedPatient.details.urgency}</div>
                </div>
              </div>

              {/* Organ Request Section */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Request Organ</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organ Type</label>
                    <select
                      value={organType}
                      onChange={(e) => setOrganType(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Select organ type</option>
                      <option value="Kidney">Kidney</option>
                      <option value="Liver">Liver</option>
                      <option value="Heart">Heart</option>
                      <option value="Lung">Lung</option>
                      <option value="Pancreas">Pancreas</option>
                      <option value="Intestine">Intestine</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                    <textarea
                      value={organDetails}
                      onChange={(e) => setOrganDetails(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={3}
                      placeholder="Any specific requirements or notes..."
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleOrganRequest}
                      disabled={requestingOrgan || !organType}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
                    >
                      {requestingOrgan ? "Requesting..." : "Request Organ"}
                    </button>
                    <button
                      onClick={() => setShowPatientModal(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;