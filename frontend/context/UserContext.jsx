import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthDataContext } from './AuthContext'; // Assuming this provides serverUrl


export const UserDataContext = createContext(null);


const UserContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { serverUrl } = useContext(AuthDataContext);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
       
        const response = await axios.get(`${serverUrl}/api/user/getcurrentuser`, {
          withCredentials: true,
        });

        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Not authenticated or server error:", error.response?.data?.message || error.message);
        setUser(null); 
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []); 

  
  return (
    <UserDataContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserContext;