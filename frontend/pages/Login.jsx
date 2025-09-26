import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthDataContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../utils/firebase.js";
import { UserDataContext } from '../context/UserContext.jsx';

const Login = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

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
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const name = user.displayName;
      const uid = user.uid;
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
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen">
      {/* Background image */}
      <img
        src="Login.png"  // <-- replace with your image path
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay (optional for dimming effect) */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Login Card */}
      <div className="relative w-full max-w-md p-8 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl space-y-6 sm:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-800">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to continue</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition"
        >
          <FcGoogle className="w-5 h-5 mr-3" />
          Sign in with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#FDC800] hover:bg-[#CA8A04] text-white font-semibold rounded-md shadow-md transition duration-200"
          >
            Log In
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/Signup"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
