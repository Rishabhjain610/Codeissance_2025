// ...existing code...
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      // First try to get ML model results
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
        const res = await axios.post(
          `${serverUrl}/api/request/organ`,
          {
            hospitalId: user._id,
            organType,
            location: user.location,
          },
          { withCredentials: true }
        );
        setResult(res.data);
      } else {
        // Use ML model results
        setResult({
          message: `Found ${mlDonors.length} potential organ matches via ML model`,
          donors: mlDonors
        });
      }
    } catch (err) {
      setResult({ message: "Error requesting organ." });
    }
    setLoading(false);
  };

  const contactUser = async (donor) => {
    try {
      const donorPhone =
        donor.phone ||
        donor.hospital_contact_number ||
        donor.contact_number ||
        donor.phone_number ||
        donor.contact;
      const payload = {
        donorName: donor.name || donorName,
        donorPhone,
        hospitalName: user.name || "Hospital",
        location: user.location || { latitude: 0, longitude: 0 },
      };
      await axios.post(`${serverUrl}/api/notify/contact-user`, payload, {
        withCredentials: true,
      });
      alert("Contact request sent.");
    } catch (err) {
      console.error(err);
      alert("Failed to send contact request.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center bg-gray-50 ml-64 p-8">
        <h2 className="text-3xl font-bold text-red-600 mb-6">Request Organ</h2>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-full max-w-md mb-6">
          <label className="block mb-2 font-semibold text-gray-700">Organ Type</label>
          <input
            type="text"
            value={organType}
            onChange={(e) => setOrganType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full mb-6 focus:outline-none focus:ring-2 focus:ring-red-200"
            placeholder="e.g. Kidney"
            required
          />
          <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition">
            {loading ? "Requesting..." : "Request Organ"}
          </button>
        </form>

        {/* {result && (
          <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
            <div className="font-bold mb-2 text-red-600">{result.message}</div>
            {result.donors && (
              <div>
                <div className="font-semibold mt-2 mb-1">Donors:</div>
                <ul className="space-y-2">
                  {result.donors.map((d, i) => (
                    <li key={i} className="flex items-center justify-between border rounded p-3">
                      <div className="text-sm">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-gray-600 text-xs">{d.phone || d.hospital_contact_number || `${d.latitude},${d.longitude}`}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => contactUser(d)}
                        className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        Contact
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )} */}
        {result.donors && Array.isArray(result.donors) && result.donors.length > 0 && (
  <div>
    <div className="font-semibold mt-2 mb-1">Donors:</div>
    <ul className="space-y-2">
      {result.donors.map((d, i) => (
        <li key={i} className="flex items-center justify-between border rounded p-3">
          <div className="text-sm">
            <div className="font-medium">{d.name}</div>
            <div className="text-gray-600 text-xs">{d.phone || d.hospital_contact_number || `${d.latitude},${d.longitude}`}</div>
          </div>
          <button
            type="button"
            onClick={() => contactUser(d)}
            className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
          >
            Contact
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
{result.donors && Array.isArray(result.donors) && result.donors.length === 0 && (
  <div className="text-gray-500">No donors found.</div>
)}
{result.donors && !Array.isArray(result.donors) && (
  <div className="text-gray-500">No donors found or invalid response.</div>
)}
      </div>
    </div>
  );
};

export default RequestOrganPage;
// ...existing code...