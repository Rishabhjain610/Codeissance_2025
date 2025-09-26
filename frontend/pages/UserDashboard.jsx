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
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result;
          setFormData((prev) => ({
            ...prev,
            medicalCertificateBase64: base64Image,
          }));
          setGeminiResult("");
          // Upload to Cloudinary
          const res = await axios.post(
            `${serverUrl}/api/upload/certificate`,
            { image: base64Image },
            { withCredentials: true, timeout: 30000 }
          );
          if (res.data && res.data.url) {
            setFormData((prev) => ({
              ...prev,
              medicalCertificateUrl: res.data.url,
            }));
            toast.success("Certificate uploaded successfully!");
          } else {
            throw new Error("Invalid response from upload service");
          }
        } catch (uploadError) {
          toast.error("Failed to upload certificate. Please try again.");
          setFormData((prev) => ({
            ...prev,
            medicalCertificateUrl: "",
            medicalCertificateBase64: "",
          }));
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  // Gemini eligibility check via backend
  const checkWithGemini = async () => {
    if (!formData.medicalCertificateBase64) {
      toast.error("Please upload a medical certificate first");
      return;
    }
    setCheckingEligibility(true);
    setGeminiResult("loading");
    setRejectionReason("");
    try {
      const res = await axios.post(
        `${serverUrl}/api/gemini/check-certificate`,
        { base64Image: formData.medicalCertificateBase64 },
        { withCredentials: true, timeout: 45000 }
      );
      if (res.data && (res.data.result === "yes" || res.data.result === "no")) {
        setGeminiResult(res.data.result);
        setFormData((prev) => ({
          ...prev,
          bloodGroup: res.data.bloodGroup || prev.bloodGroup,
          phone: res.data.phone || prev.phone,
          sex: res.data.sex || prev.sex,
          age: res.data.age || prev.age,
          location: {
            ...prev.location,
            city: res.data.city || prev.location.city,
          },
        }));
        setRejectionReason(res.data.reason || "");
        if (res.data.result === "yes") {
          toast.success("You are eligible to donate blood!");
        } else {
          toast.warning("Based on your medical certificate, you are not eligible to donate blood at this time.");
        }
      } else {
        throw new Error("Invalid response from eligibility service");
      }
    } catch (error) {
      setGeminiResult("error");
      setRejectionReason("");
      toast.error("Failed to check eligibility. Please try again later.");
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Block form submission if not eligible
  const isBlocked =
    formData.hasCoughCold || formData.hasBloodDisease || geminiResult === "no";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBlocked) {
      toast.error("You are not eligible to donate blood based on current health conditions.");
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
      toast.error("Error updating profile. Please try again.");
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  required
                  disabled
                />
              </div>
              {/* Sex field - read-only, filled by OCR */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sex (from certificate)</label>
                <input
                  name="sex"
                  type="text"
                  value={formData.sex}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  placeholder="Auto-filled from certificate"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Age (from certificate)</label>
                <input
                  name="age"
                  type="number"
                  value={formData.age}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  placeholder="Auto-filled from certificate"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Group</label>
                <input
                  name="bloodGroup"
                  type="text"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                  placeholder="e.g. A+, B-, O+"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                  placeholder="Mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    name="location.latitude"
                    type="text"
                    value={formData.location.latitude}
                    onChange={handleChange}
                    className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition mb-2 sm:mb-0"
                    placeholder="Latitude"
                  />
                  <input
                    name="location.longitude"
                    type="text"
                    value={formData.location.longitude}
                    onChange={handleChange}
                    className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition mb-2 sm:mb-0"
                    placeholder="Longitude"
                  />
                  <input
                    name="location.city"
                    type="text"
                    value={formData.location.city}
                    onChange={handleChange}
                    className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
                    placeholder="City"
                  />
                </div>
                <GeolocationButton onLocation={handleLocation} />
              </div>
              <div className="flex gap-6 mt-2 flex-wrap">
                <label className="flex items-center gap-2 font-semibold text-gray-700">
                  <input
                    name="canDonateBlood"
                    type="checkbox"
                    checked={formData.canDonateBlood}
                    onChange={handleChange}
                    className="accent-red-500 w-5 h-5"
                  />
                  Want to donate blood?
                </label>
              </div>
              <div className="flex gap-6 mt-2 flex-wrap">
                <label className="flex items-center gap-2 font-semibold text-gray-700">
                  <input
                    name="hasCoughCold"
                    type="checkbox"
                    checked={formData.hasCoughCold}
                    onChange={handleChange}
                    className="accent-red-500 w-5 h-5"
                  />
                  Do you have cough/cold?
                </label>
                <label className="flex items-center gap-2 font-semibold text-gray-700">
                  <input
                    name="hasBloodDisease"
                    type="checkbox"
                    checked={formData.hasBloodDisease}
                    onChange={handleChange}
                    className="accent-red-500 w-5 h-5"
                  />
                  Any blood-related disease?
                </label>
              </div>
              {(formData.hasCoughCold || formData.hasBloodDisease) && (
                <div className="col-span-2 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg font-semibold text-center">
                  You cannot donate blood due to current health conditions.
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Medical Certificate
                </label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                      disabled={uploading}
                    />
                    {uploading && (
                      <span className="text-sm text-gray-500 animate-pulse">
                        Uploading...
                      </span>
                    )}
                  </div>
                  {formData.medicalCertificateUrl && (
                    <div className="flex items-start gap-4">
                      <img
                        src={formData.medicalCertificateUrl}
                        alt="Medical Certificate"
                        className="rounded shadow w-32 h-32 object-cover border"
                      />
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={checkWithGemini}
                          disabled={
                            !formData.medicalCertificateBase64 ||
                            checkingEligibility ||
                            uploading
                          }
                          className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkingEligibility
                            ? "Checking Eligibility..."
                            : "Check Eligibility with AI"}
                        </button>
                      </div>
                    </div>
                  )}
                  {geminiResult === "loading" && (
                    <div className="mt-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg font-semibold text-center">
                      <div className="animate-pulse">Analyzing your medical certificate...</div>
                    </div>
                  )}
                  {geminiResult === "no" && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg font-semibold text-center">
                      ❌ Based on your medical certificate, you are not eligible to donate blood at this time.
                      {rejectionReason && (
                        <div className="mt-2 text-red-800 text-sm font-normal">
                          <strong>Reason:</strong> {rejectionReason}
                        </div>
                      )}
                    </div>
                  )}
                  {geminiResult === "yes" && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg font-semibold text-center">
                      ✅ Great! You are eligible to donate blood based on your medical certificate.
                      <Link
                        to="/appointment/book"
                        className="ml-2 underline text-red-700 hover:text-red-800"
                      >
                        Book Appointment Now
                      </Link>
                    </div>
                  )}
                  {geminiResult === "error" && (
                    <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg font-semibold text-center">
                      ⚠️ Unable to analyze certificate. Please try uploading again or contact support.
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <button
                  type="submit"
                  className={`w-full py-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold rounded-lg shadow-lg hover:from-red-600 hover:to-red-800 transition text-lg tracking-wide ${
                    isBlocked ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={loading || isBlocked || uploading || checkingEligibility}
                >
                  {loading ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    "Update Profile"
                  )}
                </button>
                {isBlocked && (
                  <p className="text-center text-red-600 text-sm mt-2">
                    Profile update is disabled due to blood donation eligibility restrictions.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;