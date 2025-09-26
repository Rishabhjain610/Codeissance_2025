import React, { useEffect, useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import GeolocationButton from "../components/GeolocationButton";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const UserDashboard = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user, setUser } = useContext(UserDataContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    sex: "",
    age: "",
    bloodGroup: "",
    phone: "",
    location: { latitude: "", longitude: "", city: "" },
    canDonateBlood: false,
    hasCoughCold: false,
    hasBloodDisease: false,
    medicalCertificateUrl: "",
    medicalCertificateBase64: "",
  });
  const [loading, setLoading] = useState(true);
  const [geminiResult, setGeminiResult] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/getcurrentuser`, {
          withCredentials: true,
        });
        if (res.data && res.data.user) {
          setFormData({
            name: res.data.user.name || "",
            email: res.data.user.email || "",
            sex: res.data.user.sex || "",
            age: res.data.user.age || "",
            bloodGroup: res.data.user.bloodGroup || "",
            phone: res.data.user.phone || "",
            location: res.data.user.location || {
              latitude: "",
              longitude: "",
              city: "",
            },
            canDonateBlood: res.data.user.canDonateBlood || false,
            hasCoughCold: false,
            hasBloodDisease: false,
            medicalCertificateUrl: res.data.user.medicalCertificateUrl || "",
            medicalCertificateBase64: "",
          });
          setUser(res.data.user);
        }
      } catch (err) {
        toast.error("Failed to fetch user details");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("location.")) {
      const locField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, [locField]: value },
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Geolocation integration
  const handleLocation = (coords) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    }));
  };

  // Upload image to Cloudinary and store base64 for Gemini
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;
        setFormData((prev) => ({
          ...prev,
          medicalCertificateBase64: base64Image,
        }));
        // Upload to Cloudinary
        const res = await axios.post(
          `${serverUrl}/api/upload/certificate`,
          { image: base64Image },
          { withCredentials: true }
        );
        setFormData((prev) => ({
          ...prev,
          medicalCertificateUrl: res.data.url,
        }));
        toast.success("Certificate uploaded!");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Gemini eligibility check via backend
  const checkWithGemini = async () => {
    if (!formData.medicalCertificateBase64) return;
    setGeminiResult("loading");
    try {
      const res = await axios.post(
        `${serverUrl}/api/gemini/check-certificate`,
        { base64Image: formData.medicalCertificateBase64 },
        { withCredentials: true }
      );
      setGeminiResult(res.data.result); // "yes" or "no"
    } catch {
      setGeminiResult("error");
      toast.error("Gemini check failed");
    }
  };

  // Block form submission if not eligible
  const isBlocked =
    formData.hasCoughCold || formData.hasBloodDisease || geminiResult === "no";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBlocked) {
      toast.error("You are not eligible to donate blood.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(
        `${serverUrl}/api/user/updateprofile`,
        formData,
        { withCredentials: true }
      );
      if (res.data && res.data.success) {
        toast.success("Profile updated successfully!");
        setUser(res.data.user);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (err) {
      toast.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-red-50">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-start ml-64 py-10 px-2 sm:px-4">
        <h1 className="text-4xl font-extrabold text-red-600 mb-8 tracking-tight drop-shadow-lg text-center">
          User Dashboard
        </h1>
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 sm:p-10 border border-red-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <span className="inline-block w-2 h-6 bg-red-500 rounded-full mr-2"></span>
            Update Your Details
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">
              Loading...
            </div>
          ) : (
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
              onSubmit={handleSubmit}
            >
              {/* ...all your other fields... */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Upload Medical Certificate (image)
                </label>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block"
                    disabled={uploading}
                  />
                  {formData.medicalCertificateUrl && (
                    <img
                      src={formData.medicalCertificateUrl}
                      alt="Medical Certificate"
                      className="mt-2 rounded shadow w-32"
                    />
                  )}
                  <button
                    type="button"
                    onClick={checkWithGemini}
                    disabled={
                      !formData.medicalCertificateBase64 ||
                      geminiResult === "loading"
                    }
                    className="py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    {geminiResult === "loading"
                      ? "Checking..."
                      : "Check Eligibility"}
                  </button>
                </div>
                {geminiResult === "no" && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg font-semibold text-center">
                    You cannot donate blood as per your medical certificate.
                  </div>
                )}
                {geminiResult === "yes" && (
                  <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg font-semibold text-center">
                    You are eligible to donate blood!
                    <Link
                      to="/appointment/book"
                      className="ml-2 underline text-red-700"
                    >
                      Book Appointment
                    </Link>
                  </div>
                )}
              </div>
              {/* ...rest of your form... */}
              <div className="col-span-2">
                <button
                  type="submit"
                  className={`w-full py-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold rounded-lg shadow-lg hover:from-red-600 hover:to-red-800 transition text-lg tracking-wide ${
                    isBlocked ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={loading || isBlocked}
                >
                  {loading ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    "Update Profile"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;