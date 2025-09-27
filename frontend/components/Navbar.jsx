

// export default Navbar;
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HeartPulse, LogIn, UserPlus, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthDataContext } from '../context/AuthContext';
import { UserDataContext } from '../context/UserContext';

const Navbar = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user, setUser } = useContext(UserDataContext);

  // State for mobile and profile menu visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Ref for the profile menu to detect outside clicks
  const profileMenuRef = useRef(null);

  // Close profile menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleLogoutClick = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUser(null);
      setIsProfileMenuOpen(false); // Close menu on logout
      toast.success('You have been successfully logged out!');
    } catch (error) {
      toast.error('Logout failed. Please try again.');
      console.error('Logout error:', error);
    }
  };

  const activeLinkStyle = {
    color: '#DC2626', // red-600
    fontWeight: '600',
  };

  return (
    <header className="sticky top-0 left-0 w-full bg-white/90 backdrop-blur-md z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}

          <Link
            
            className="text-2xl font-bold text-red-600 flex items-center hover:text-red-700 transition-transform duration-300 hover:scale-105"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <HeartPulse className="w-7 h-7 mr-2" />
            LifeConnect
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            <NavLink
              to="/#features"
              className="text-gray-600 hover:text-red-600 font-medium transition duration-300"
            >
              Features
            </NavLink>
            <NavLink
              to="/contact"
              style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
              className="text-gray-600 hover:text-red-600 font-medium transition duration-300"
            >
              Contact
            </NavLink>
          </nav>

          {/* Auth buttons and User Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  aria-label="Open user menu"
                >
                  {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                </button>
                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 transition ease-out duration-200 origin-top-right transform opacity-100 scale-100">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm text-gray-700">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                       <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </Link>
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="py-2 px-4 text-gray-800 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:text-red-600 transition duration-300 text-sm font-medium flex items-center">
                  <LogIn className="w-4 h-4 mr-2" /> Sign In
                </Link>
                <Link to="/signup" className="hidden sm:inline-flex items-center py-2 px-4 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-300 text-sm font-medium">
                  <UserPlus className="w-4 h-4 mr-2" /> Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-red-600 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <nav className="flex flex-col space-y-2">
              {user && (
                <div className="px-2 py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                             {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                        </div>
                        <div>
                             <p className="font-medium text-gray-800">{user.name}</p>
                             <p className="text-sm text-gray-500">Welcome back!</p>
                        </div>
                    </div>
                </div>
              )}
               <NavLink to="/#features" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:bg-red-50 block px-3 py-2 rounded-md text-base font-medium">Features</NavLink>
               <NavLink to="/contact" onClick={() => setIsMobileMenuOpen(false)} style={({ isActive }) => (isActive ? activeLinkStyle : undefined)} className="text-gray-700 hover:bg-red-50 block px-3 py-2 rounded-md text-base font-medium">Contact</NavLink>
              
               <div className="border-t border-gray-200 pt-4 mt-2 space-y-3">
               {user ? (
                   <>
                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center text-gray-700 hover:bg-red-50 w-full px-3 py-2 rounded-md text-base font-medium">
                       <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                    </Link>
                     <button onClick={handleLogoutClick} className="flex items-center text-gray-700 hover:bg-red-50 w-full px-3 py-2 rounded-md text-base font-medium">
                       <LogOut className="w-5 h-5 mr-3" /> Logout
                     </button>
                   </>
                 ) : (
                   <div className="flex items-center justify-around">
                     <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-2 px-4 text-gray-800 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:text-red-600 transition duration-300 text-sm font-medium flex items-center justify-center">
                       <LogIn className="w-4 h-4 mr-2" /> Sign In
                     </Link>
                     <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center ml-2 py-2 px-4 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-300 text-sm font-medium flex items-center justify-center">
                       <UserPlus className="w-4 h-4 mr-2" /> Sign Up
                     </Link>
                   </div>
                 )}
               </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;