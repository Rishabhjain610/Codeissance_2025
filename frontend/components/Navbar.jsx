import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, LogIn, UserPlus, LogOut } from 'lucide-react'; 
import { toast } from 'react-toastify';
import axios from 'axios';

// The Navbar receives props for user state and logout function
const Navbar = ({ isAuthenticated, handleLogout }) => {

  // Placeholder for the server URL. In a real app, this would come from context/config.
  const serverUrl = 'http://localhost:5000'; 

  // Function to handle the actual API logout call
  const handleLogoutClick = async () => {
    try {
      // You should adjust the API endpoint and method as necessary
      await axios.post(`${serverUrl}/api/auth/logout`, {}, {
        withCredentials: true,
      });
      // Call the parent/context logout function on success
      handleLogout(); 
      toast.success('You have been successfully logged out!');
    } catch (error) {
      toast.error('Logout failed. Please try again.');
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 left-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
        
        {/* Logo/Branding */}
        <Link to="/" className="text-2xl font-bold text-red-600 flex items-center hover:text-red-700 transition duration-300">
          <HeartPulse className="w-7 h-7 mr-2" />
          LifeConnect
        </Link>
        
        {/* Navigation Links (Middle) */}
        <nav className="hidden md:flex space-x-8">
          <a href="/#features" className="text-gray-600 hover:text-red-600 font-medium transition duration-300">
            Features
          </a>
          <a href="/login" className="text-gray-600 hover:text-red-600 font-medium transition duration-300">
            Dashboard
          </a>
          <a href="/contact" className="text-gray-600 hover:text-red-600 font-medium transition duration-300">
            Contact
          </a>
        </nav>
        
        {/* Authentication Buttons (Right) */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            // State: LOGGED IN (Show Logout)
            <button
              onClick={handleLogoutClick}
              className="py-2 px-4 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-300 text-sm font-medium flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          ) : (
            // State: LOGGED OUT (Show Sign In / Sign Up)
            <>
              <Link
                to="/login"
                className="py-2 px-4 text-gray-800 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:text-red-600 transition duration-300 text-sm font-medium flex items-center"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
              <Link
                to="/signup"
                className="hidden sm:inline-flex items-center py-2 px-4 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-300 text-sm font-medium"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;