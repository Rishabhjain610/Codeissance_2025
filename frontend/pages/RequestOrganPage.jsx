import React, { useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";

const RequestOrganPage = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [organType, setOrganType] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setError("");
    setLoading(true);
    
    try {
      // Validate inputs
      if (!organType) {
        setError("Please select an organ type");
        setLoading(false);
        return;
      }

      if (!user?.location?.latitude || !user?.location?.longitude) {
        setError("Please update your hospital location in profile settings");
        setLoading(false);
        return;
      }

      const requestData = {
        hospitalId: user._id,
        organType,
        location: user.location,
      };

      // Use backend API which handles both Flask and fallback
      const response = await axios.post(
        `${serverUrl}/api/request/organ`,
        requestData,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );

      setResult(response.data);

    } catch (err) {
      console.error("Error requesting organ:", err);
      const errorMessage = err.response?.data?.message || 
                          "Failed to process organ request. Please try again.";
      setError(errorMessage);
    }
    
    setLoading(false);
  };

  const contactUser = async (donor) => {
    try {
      const donorPhone = donor.hospital_contact_number || donor.contact_number;
      
      if (!donorPhone) {
        alert("No contact information available for this donor");
        return;
      }

      // In a real implementation, this would send a notification/email
      alert(`Contacting: ${donor.name} at ${donorPhone}`);
      
    } catch (err) {
      console.error("Contact error:", err);
      alert("Failed to initiate contact. Please try manual contact.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center bg-gray-50 ml-64 p-8">
        <h2 className="text-3xl font-bold text-red-600 mb-6">Request Organ</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full max-w-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-full max-w-md mb-6">
          <label className="block mb-2 font-semibold text-gray-700">Organ Type</label>
          <select
            value={organType}
            onChange={(e) => setOrganType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full mb-6 focus:outline-none focus:ring-2 focus:ring-red-200"
            required
          >
            <option value="">Select an organ</option>
            <option value="Kidney">Kidney</option>
            <option value="Heart">Heart</option>
            <option value="Liver">Liver</option>
            <option value="Lung">Lung</option>
          </select>
          
          <button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 disabled:bg-red-400 transition w-full"
          >
            {loading ? "Searching for Donors..." : "Find Organ Donors"}
          </button>
        </form>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow w-full max-w-4xl">
            <div className={`font-bold mb-4 text-lg ${
              result.donors?.length > 0 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {result.message}
            </div>
            
            {result.donors && result.donors.length > 0 ? (
              <div>
                <div className="font-semibold mb-3 text-gray-700">
                  Available Donors ({result.donors.length} found):
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.donors.map((donor, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {donor.name || `Donor ${index + 1}`}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Contact: {donor.hospital_contact_number || donor.contact_number || "Information available upon request"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {donor.distance_km && `Distance: ${donor.distance_km.toFixed(2)} km`}
                            {donor.suitability_score && ` • Match Score: ${donor.suitability_score.toFixed(3)}`}
                          </div>
                        </div>
                        <button
                          onClick={() => contactUser(donor)}
                          className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 transition"
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                No organ donors found matching your criteria. Please try a different organ type or check back later.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestOrganPage;