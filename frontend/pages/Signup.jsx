import React, { useState, useContext } from "react";
import { AuthDataContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import axios from "axios";
import { toast } from "react-toastify";
import { FcGoogle } from "react-icons/fc";
import { UserDataContext } from "../context/UserContext.jsx";

const Signup = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name || !formData.email || !formData.password) {
      setError("All fields are required.");
      return;
    }
    try {
      const response = await axios.post(
        `${serverUrl}/api/auth/register`,
        formData,{
          withCredentials: true
        }
      );
      if (response.data.success) {
        toast.success("Signup successful");
        setUser(response.data.user);
        navigate("/");
      }
    } catch (err) {
      const errorMessage = err.response
        ? err.response.data
        : "Signup failed. Please try again.";
      setError(errorMessage);
      console.error("Signup error:", errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const name = user.displayName;
      const email = user.email;

      const response = await axios.post(`${serverUrl}/api/auth/google-signin`, {
        name,
        email,
      },{
        withCredentials: true
      });

      if (response.data.success) {
        toast.success(response.data.message || "Google signup successful!");
        setUser(response.data.user);
        navigate("/");
      } else {
        toast.error(response.data.message || "Google signup failed!");
      }
    } catch (error) {
      toast.error("Google signup failed!");
      console.error("Google signup error:", error);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen">
      {/* Background image */}
      <img
        src="Login.png" // <-- replace with your image path
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay (optional, makes text more readable) */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Signup card */}
      <div className="relative w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur-md rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join us and start your journey
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition"
        >
          <FcGoogle className="w-5 h-5 mr-3" />
          Sign up with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#FDC800] hover:bg-[#CA8A04] text-white font-semibold rounded-md shadow-md transition duration-200"
          >
            Create Account
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;