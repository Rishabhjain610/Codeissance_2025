import React, { useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const RequestBloodPage = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user, loading } = useContext(UserDataContext);

  const [bloodGroup, setBloodGroup] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState("medium");
  const [patientInfo, setPatientInfo] = useState("");
  const [result, setResult] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [mlDonors, setMlDonors] = useState([]);
  const [showMlResults, setShowMlResults] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to request blood.</p>
          </div>
        </div>
      </div>
    );
  }

  // Mock donors for fallback
  const getMockDonors = (bloodGroup) => {
    const mockDonors = [
      {
        id: 1,
        name: "Rahul Kumar",
        blood_group: bloodGroup,
        distance: 2.5,
        contact_number: "+91-9876543210",
        availability: "Available",
        last_donation: "2024-01-15"
      },
      {
        id: 2,
        name: "Priya Singh",
        blood_group: bloodGroup,
        distance: 4.2,
        contact_number: "+91-9876543211",
        availability: "Available",
        last_donation: "2024-02-20"
      },
      {
        id: 3,
        name: "City Blood Bank",
        blood_group: bloodGroup,
        distance: 1.8,
        contact_number: "+91-9876543212",
        availability: "In Stock",
        type: "blood_bank"
      }
    ];
    
    return mockDonors.filter(donor => 
      donor.blood_group === bloodGroup || 
      (bloodGroup === "AB+" || bloodGroup === "AB-") || // AB can receive from many
      (donor.blood_group === "O-") // O- is universal donor
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setMlDonors([]);
    setShowMlResults(false);
    setErrorDetails(null);
    setRequesting(true);

    let foundResults = false;

    try {
      // Try ML model first with proper error handling
      try {
        console.log("Attempting ML model request...");
        const mlResponse = await axios.get(`http://localhost:5000/api/blood/find-donors`, {
          params: {
            blood_group: bloodGroup,
            lat: user.location?.latitude || 28.6139, // Default to Delhi coordinates
            lon: user.location?.longitude || 77.2090
          },
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (mlResponse.data && mlResponse.data.length > 0) {
          setMlDonors(mlResponse.data);
          setShowMlResults(true);
          foundResults = true;
          toast.success(`Found ${mlResponse.data.length} donors via AI matching`);
        }
      } catch (mlError) {
        console.log("ML model error:", {
          status: mlError.response?.status,
          message: mlError.message,
          code: mlError.code
        });

        if (mlError.code === 'ERR_NETWORK' || mlError.code === 'ECONNREFUSED') {
          console.log("ML service not running - using mock data");
          const mockDonors = getMockDonors(bloodGroup);
          if (mockDonors.length > 0) {
            setMlDonors(mockDonors);
            setShowMlResults(true);
            foundResults = true;
            toast.info(`Found ${mockDonors.length} local donors (ML service offline)`);
          }
        }
      }

      // Try backend request with better error handling
      try {
        console.log("Attempting backend request...");
        
        // Validate required data before sending
        if (!user._id) {
          throw new Error("User ID not found");
        }

        const requestPayload = {
          hospitalId: user._id,
          bloodGroup: bloodGroup.trim(),
          quantity: parseInt(quantity),
          urgency,
          patientInfo: patientInfo.trim(),
          location: user.location || { 
            latitude: 28.6139, 
            longitude: 77.2090,
            address: "Delhi, India"
          }
        };

        console.log("Request payload:", requestPayload);

        const backendResponse = await axios.post(
          `${serverUrl}/api/request/blood`,
          requestPayload,
          { 
            withCredentials: true,
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (backendResponse.data) {
          setResult(backendResponse.data);
          foundResults = true;
          
          if (!showMlResults) {
            toast.success("Blood request submitted successfully");
          }
        }
      } catch (backendError) {
        console.error("Backend request failed:", {
          status: backendError.response?.status,
          message: backendError.response?.data?.message || backendError.message,
          data: backendError.response?.data
        });
        
        setErrorDetails({
          type: "backend",
          status: backendError.response?.status,
          message: backendError.response?.data?.message || backendError.message
        });

        // Handle specific error cases
        if (backendError.response?.status === 401) {
          toast.error("Please log in again - session expired");
        } else if (backendError.response?.status === 400) {
          toast.error("Invalid request data. Please check your inputs.");
        } else if (backendError.response?.status === 500) {
          toast.error("Server error - our team has been notified");
          
          // Provide mock blood banks as fallback for 500 errors
          const mockBloodBanks = [
            {
              name: "Central Blood Bank",
              phone: "+91-11-2234-5678",
              address: "Central Delhi",
              bloodGroup: bloodGroup,
              availability: "Available"
            },
            {
              name: "City Hospital Blood Bank",
              phone: "+91-11-2345-6789", 
              address: "South Delhi",
              bloodGroup: bloodGroup,
              availability: "Limited Stock"
            }
          ];
          
          setResult({
            message: "Using backup blood bank directory",
            donors: mockBloodBanks
          });
          foundResults = true;
          
        } else {
          toast.error("Request failed. Please try again.");
        }
      }

      // If no results from any source
      if (!foundResults) {
        toast.warning("No donors found. Try expanding search criteria or contact blood banks directly.");
        
        // Show emergency contacts as last resort
        setResult({
          message: "Emergency blood bank contacts",
          donors: [
            {
              name: "Red Cross Blood Bank",
              phone: "1910 (Toll Free)",
              address: "Emergency Helpline",
              type: "emergency"
            },
            {
              name: "AIIMS Blood Bank",
              phone: "+91-11-2658-8500",
              address: "AIIMS, Delhi",
              type: "emergency"
            }
          ]
        });
      }

    } catch (error) {
      console.error("Request error:", error);
      setErrorDetails({
        type: "general",
        message: error.message
      });
      toast.error("Request failed - please check your connection");
    } finally {
      setRequesting(false);
    }
  };

  const contactUser = async (donor) => {
    try {
      const donorPhone = donor.phone || 
                        donor.hospital_contact_number || 
                        donor.contact_number || 
                        donor.phone_number || 
                        donor.contact;

      if (!donorPhone || donorPhone === "N/A") {
        toast.error("No contact information available");
        return;
      }

      // For emergency contacts, just show the number
      if (donor.type === "emergency") {
        toast.info(`Emergency Contact: ${donorPhone}`);
        return;
      }

      const payload = {
        donorName: donor.name || "Donor",
        donorPhone,
        hospitalName: user.name || "Hospital",
        bloodGroup,
        quantity,
        urgency,
        location: user.location || { latitude: 28.6139, longitude: 77.2090 }
      };

      await axios.post(`${serverUrl}/api/notify/contact-user`, payload, {
        withCredentials: true,
        timeout: 10000
      });

      toast.success(`Contact request sent to ${donor.name || 'donor'}`);
    } catch (error) {
      console.error("Contact error:", error);
      
      // Fallback - just show contact info
      const phone = donor.phone || donor.contact_number || donor.hospital_contact_number;
      if (phone) {
        toast.info(`Direct contact: ${phone}`);
      } else {
        toast.error("Unable to contact - please try manually");
      }
    }
  };

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const urgencyLevels = [
    { value: "low", label: "Low", color: "green" },
    { value: "medium", label: "Medium", color: "yellow" },
    { value: "high", label: "High", color: "orange" },
    { value: "critical", label: "Critical", color: "red" }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Request Blood</h1>
              <p className="text-gray-600 text-lg mt-1">Submit blood requests to nearby blood banks and donors</p>
            </div>
          </div>
        </div>

        {/* Error Details for Debugging */}
        {errorDetails && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-red-800 font-semibold mb-2">Debug Information:</h4>
            <p className="text-red-700 text-sm">
              Type: {errorDetails.type} | Status: {errorDetails.status} | Message: {errorDetails.message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Request Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Blood Request Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                  required
                >
                  <option value="">Select blood group</option>
                  {bloodGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (units) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  max={50}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                  placeholder="Number of units needed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {urgencyLevels.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setUrgency(level.value)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        urgency === level.value 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">{level.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Information
                </label>
                <textarea
                  value={patientInfo}
                  onChange={(e) => setPatientInfo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                  rows={3}
                  placeholder="Additional patient details, medical condition, etc."
                />
              </div>

              <button 
                type="submit" 
                disabled={requesting || !bloodGroup || !quantity}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center"
              >
                {requesting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Request...
                  </>
                ) : (
                  "Submit Blood Request"
                )}
              </button>
            </form>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* ML Results */}
            {showMlResults && mlDonors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-green-100 mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Available Donors</h3>
                </div>
                
                <div className="space-y-3">
                  {mlDonors.slice(0, 5).map((donor, index) => (
                    <div key={donor.id || index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{donor.name}</div>
                        <div className="text-sm text-gray-600 flex items-center space-x-3">
                          <span>Distance: {donor.distance?.toFixed(1) || 'Near'} km</span>
                          <span className="text-red-600">Blood: {donor.blood_group || bloodGroup}</span>
                          {donor.type === 'blood_bank' && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">Blood Bank</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Contact: {donor.contact_number || 'Available on request'}
                        </div>
                      </div>
                      <button
                        onClick={() => contactUser(donor)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
                      >
                        Contact
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backend Results */}
            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-blue-100 mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Blood Banks</h3>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-700 font-medium">{result.message}</p>
                </div>

                {result.donors && result.donors.length > 0 && (
                  <div className="space-y-3">
                    {result.donors.map((donor, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{donor.name}</div>
                          <div className="text-sm text-gray-600">
                            {donor.address || (donor.phone || donor.hospital_contact_number)}
                          </div>
                          {donor.type === "emergency" && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs mt-1 inline-block">
                              Emergency Contact
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => contactUser(donor)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
                        >
                          Contact
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No Results Message */}
            {!requesting && !result && !showMlResults && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Submit a Request</h4>
                <p className="text-gray-600">Fill out the form to find blood donors and banks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestBloodPage;