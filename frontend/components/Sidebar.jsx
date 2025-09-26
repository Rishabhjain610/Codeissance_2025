import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";

const Sidebar = ({ role }) => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUser(null);
      toast.success('You have been successfully logged out!');
      navigate("/");
    } catch (error) {
      toast.error('Logout failed. Please try again.');
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="h-screen w-64 bg-white shadow-lg flex flex-col py-8 px-4 fixed left-0 top-0">
      <h2 className="text-2xl font-bold text-red-600 mb-8 text-center">Dashboard</h2>
      <nav className="flex flex-col space-y-4">
        <Link to="/dashboard/user" className="py-2 px-4 rounded hover:bg-red-50 font-semibold">User Home</Link>
        <Link to="/dashboard/hospital" className="py-2 px-4 rounded hover:bg-red-50 font-semibold">Hospital Home</Link>
        <Link to="/dashboard/bloodbank" className="py-2 px-4 rounded hover:bg-red-50 font-semibold">Blood Bank Home</Link>
        {/* Add more buttons/links as needed */}
        <button
          onClick={handleLogoutClick}
          className="py-2 px-4 rounded hover:bg-gray-100 font-semibold text-gray-500 mt-8 text-left"
        >
          Logout
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;