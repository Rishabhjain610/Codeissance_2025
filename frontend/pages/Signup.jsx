import React, { useState, useContext, createContext } from 'react';
import { Link } from 'react-router-dom'; // Keep Link, remove useNavigate from here
import axios from 'axios';
import { toast } from 'react-toastify';

// --- START: Error Resolution Section (Mocks) ---
// The following code has been added to make this component self-contained
// and resolve previous compilation errors, including the "Identifier 'useNavigate' has already been declared" error.

// 1. Mock Contexts to resolve import errors.
const AuthDataContext = createContext({ serverUrl: 'http://localhost:5000' });
const UserDataContext = createContext({ setUser: () => console.log('setUser called') });

// 2. Inline SVG components to replace 'react-icons/fc' and 'lucide-react' imports.
const FcGoogle = () => (
  <svg className="w-6 h-6 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.904,36.466,44,30.825,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

const HeartPulse = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.28"></path>
    </svg>
);

// 3. Mock Firebase utilities to resolve import errors.
const auth = {}; // Placeholder auth object
const provider = {}; // Placeholder provider object
const signInWithPopup = async (auth, provider) => {
    console.warn("Firebase signInWithPopup is mocked. This will not perform a real Google sign-in.");
    return Promise.resolve({
        user: {
            displayName: "Mock Google User",
            email: "mock.google.user@example.com",
        },
    });
};

// 4. Mock the useNavigate hook (Corrected to avoid redeclaration error)
const useNavigate = () => {
    const navigateMock = (path) => console.log(`Navigation Mock: Attempted navigation to ${path}`);
    return navigateMock;
};
// --- END: Error Resolution Section (Mocks) ---

const Signup = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '', 
  });
  const [loading, setLoading] = useState(false); // State for loading

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Added role to the validation check
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${serverUrl}/api/auth/register`, formData, {
        withCredentials: true,
      });
      if (response.data.success) {
        toast.success('Signup successful!');
        setUser(response.data.user);
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Signup failed. Please try again.';
      toast.error(errorMessage);
      console.error('Signup error:', errorMessage);
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
        toast.success(response.data.message || "Google signup successful!");
        setUser(response.data.user);
        navigate("/");
      } else {
        toast.error(response.data.message || "Google signup failed!");
      }
    } catch (error) {
      toast.error("Google signup failed!");
      console.error("Google signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-100">
      
      {/* Background Image */}
      <img
        src="/organDonation.jpg" // Using the same image for consistency
        alt="A clean, modern image suggesting technology and care"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark Overlay for contrast */}
      <div className="absolute inset-0 bg-gray-900/60" /> 

      {/* Signup Card Container: Applied Login's sizing (max-w-md, p-6, space-y-5) */}
      <div className="relative w-full max-w-md p-6 bg-white rounded-xl shadow-2xl space-y-5 transition-all duration-300 transform hover:shadow-red-500/30">
        
        {/* Header with Logo/Title */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-3xl font-bold text-red-600 mb-2">
            <HeartPulse className="w-8 h-8 mr-2" />
            LifeConnect
          </Link>
          <h2 className="text-2xl font-extrabold text-gray-800">Create an Account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Join LifeConnect and make a difference
          </p>
        </div>

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="flex items-center justify-center w-full px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-50 transition duration-300 disabled:opacity-50"
        >
          <FcGoogle />
          Sign up with Google
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

          {/* Role Dropdown */}
          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
              Select Role
            </label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 focus:outline-none transition duration-150"
            >
              <option value="" disabled>Select your role</option>
              <option value="Donor">Donor</option>
              <option value="Blood Bank">Blood Bank</option>
              <option value="Hospital">Hospital</option>
            </select>
          </div>
          
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 focus:outline-none transition duration-150"
            />
          </div>
          
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
          </div>

          {/* Signup Button */}
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
              'Create Account'
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-sm text-center text-gray-600 pt-2">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-red-600 hover:text-red-700 transition duration-150 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
