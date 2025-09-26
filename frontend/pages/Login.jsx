import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthDataContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import { UserDataContext } from '../context/UserContext.jsx';
import { HeartPulse } from 'lucide-react'; // Added a relevant icon

const Login = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false); // State for loading

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${serverUrl}/api/auth/login`, formData, {
        withCredentials: true,
      });
      if (response.data.success) {
        toast.success('Login successful!');
        setUser(response.data.user);
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      console.error('Login error:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const name = user.displayName;
      const email = user.email;

      const response = await axios.post(`${serverUrl}/api/auth/google-signin`, {
        name,
        email,
      }, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Google Login successful!");
        setUser(response.data.user);
        navigate("/");
      } else {
        toast.error(response.data.message || "Google Login failed!");
      }
    } catch (error) {
      toast.error("Google Login failed!");
      console.error("Google Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-100">
      
      {/* Background Image (using the provided image name) */}
      <img
        src="/organDonation.jpg" // Replace with your actual path
        alt="A clean, modern image suggesting technology and care"
        className="absolute inset-0 w-full h-full object-cover"
        // Style to give the image a slightly darker, more professional tone
      />

      {/* Dark Overlay for contrast and professional look */}
      <div className="absolute inset-0 bg-gray-900/60" /> 

      {/* Login Card Container */}
      <div className="relative w-full max-w-sm p-8 bg-white rounded-xl shadow-2xl space-y-7 transition-all duration-300 transform hover:shadow-red-500/30">
        
        {/* Header with Logo/Title */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-3xl font-bold text-red-600 mb-2">
            <HeartPulse className="w-8 h-8 mr-2" />
            LifeConnect
          </Link>
          <h2 className="text-2xl font-extrabold text-gray-800">Sign In to Your Account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Access your intelligent donation dashboard
          </p>
        </div>

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="flex items-center justify-center w-full px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-50 transition duration-300 disabled:opacity-50"
        >
          <FcGoogle className="w-6 h-6 mr-3" />
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">OR</span>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@lifeconnect.org"
              className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 focus:outline-none transition duration-150"
            />
          </div>
          
          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
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
              className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 focus:outline-none transition duration-150"
            />
            {/* Optional: Forgot Password link */}
            <div className="text-right mt-1">
              <a href="#" className="text-xs font-medium text-gray-500 hover:text-red-600 transition duration-150">
                Forgot password?
              </a>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-sm text-center text-gray-600 pt-2">
          New to LifeConnect?{' '}
          <Link
            to="/signup"
            className="font-semibold text-red-600 hover:text-red-700 transition duration-150 hover:underline"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;