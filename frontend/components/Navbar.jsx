import React, { useContext } from 'react';
import axios from 'axios';
import { AuthDataContext } from '../context/AuthContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div>
      Navbar
      <button onClick={handleLogout} className='bg-red-600 text-white px-4 py-2 rounded ml-4'>
        Logout
      </button>
    </div>
  );
};

export default Navbar;