import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";
import { Search, Send, X } from "lucide-react";

const BloodRequest = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [bloodRequests, setBloodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // New state for the donor modal
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [foundDonors, setFoundDonors] = useState([]);
  const [isFindingDonors, setIsFindingDonors] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);

  // NOTE: This still uses mock data because your backend doesn't have an
  // endpoint to fetch a list of requests. The main functionality now comes
  // from the "Find Donors" button.
  const fetchBloodRequests = () => {
    setLoading(true);
    const mockRequests = [
      {
        _id: "mock1",
        bloodGroup: "A+",
        quantity: 2,
        status: "pending",
        createdAt: new Date().toISOString(),
        hospitalId: {
          name: "City General Hospital",
          location: { latitude: 19.076, longitude: 72.8777 },
        },
      },
      {
        _id: "mock2",
        bloodGroup: "O-",
        quantity: 1,
        status: "pending",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        hospitalId: {
          name: "Metro Hospital",
          location: { latitude: 19.0989, longitude: 72.8465 },
        },
      },
      {
        _id: "mock3",
        bloodGroup: "B+",
        quantity: 3,
        status: "fulfilled",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        hospitalId: {
          name: "Central Medical Center",
          location: { latitude: 18.9437, longitude: 72.8353 },
        },
      },
    ];
    setBloodRequests(mockRequests);
    setLoading(false);
  };

  useEffect(() => {
    fetchBloodRequests();
  }, []);

  // NEW FUNCTION: Calls the Python ML backend to find donors
  const handleFindDonors = async (request) => {
    setActiveRequest(request);
    setIsFindingDonors(true);
    setIsDonorModalOpen(true);
    setFoundDonors([]);

    try {
      // This matches the endpoint in your app.py
      const response = await axios.get(
        `http://127.0.0.1:5000/api/blood/find-donors`,
        {
          params: {
            blood_group: request.bloodGroup,
            lat: request.hospitalId.location.latitude,
            lon: request.hospitalId.location.longitude,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        setFoundDonors(response.data);
        toast.success(`Found ${response.data.length} potential donors!`);
      } else {
        toast.info("No eligible donors found for this request.");
      }
    } catch (error) {
      console.error("Error finding ML donors:", error);
      toast.error("Could not connect to the donor matching service.");
    } finally {
      setIsFindingDonors(false);
    }
  };

  // NEW FUNCTION: Contacts a specific donor
  const handleContactDonor = async (donor) => {
    toast.info(`Sending contact request to ${donor.name}...`);
    try {
      const payload = {
        donorName: donor.name,
        donorPhone: donor.contact_number, // Ensure this matches your backend expectation
        hospitalName: user.name,
        location: user.location,
      };

      await axios.post(`${serverUrl}/api/notify/contact-user`, payload, {
        withCredentials: true,
      });

      toast.success(`Contact request sent successfully to ${donor.name}`);
    } catch (error) {
      console.error("Error contacting donor:", error);
      toast.error(`Failed to contact ${donor.name}. Please try again.`);
    }
  };

  // Helper functions for stats and colors (unchanged)
  const getStatusColor = (status) => {
    // ... (rest of the function is unchanged)
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
  const filteredRequests = bloodRequests.filter(
    (req) => filter === "all" || req.status === filter
  );
  const stats = {
    total: bloodRequests.length,
    pending: bloodRequests.filter((r) => r.status === "pending").length,
    fulfilled: bloodRequests.filter((r) => r.status === "fulfilled").length,
    rejected: bloodRequests.filter((r) => r.status === "rejected").length,
  };

  // Main JSX (unchanged parts are collapsed for brevity)
  if (loading) {
    return <div>Loading...</div>; // Simplified loading state
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header and Stats Cards... (unchanged) */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Blood Requests</h1>
        </div>

        {/* Filter Tabs... (unchanged) */}
        <div className="mb-6">{/* ... tabs here ... */}</div>

        {/* Requests List - MODIFIED */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div key={request._id} className="p-6">
                <div className="flex items-center justify-between">
                  {/* Request Info */}
                  <div className="flex items-center space-x-4">
                    {/* ... request details like hospital name, date, etc. ... */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-lg font-semibold text-gray-900">
                        {request.hospitalId?.name}
                      </h5>
                      <p className="text-sm text-gray-600">
                        Requesting {request.quantity} units of{" "}
                        {request.bloodGroup}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>

                    {request.status === "pending" && (
                      <button
                        onClick={() => handleFindDonors(request)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Find Donors
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Donor Finder Modal */}
      {isDonorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Potential Donors
                </h2>
                <p className="text-gray-600">
                  For {activeRequest?.quantity} units of{" "}
                  {activeRequest?.bloodGroup} blood
                </p>
              </div>
              <button
                onClick={() => setIsDonorModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={28} />
              </button>
            </div>

            {isFindingDonors ? (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching for best matches...</p>
              </div>
            ) : foundDonors.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-lg font-semibold text-gray-700">
                  No Eligible Donors Found
                </p>
                <p className="text-gray-500 mt-2">
                  Try again later or check other sources.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[60vh] overflow-y-auto">
                {foundDonors.map((donor) => (
                  <li
                    key={donor.donor_id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        {donor.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Distance: {donor.distance_km.toFixed(1)} km |
                        Likelihood: {(donor.likelihood * 100).toFixed(0)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleContactDonor(donor)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Contact
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodRequest;
