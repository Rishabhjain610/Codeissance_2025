import React from 'react'
import { createContext } from 'react';  
export const AuthDataContext = createContext();

const AuthContext = ({ children }) => {
  const serverUrl="http://localhost:6969";
  const value={
    serverUrl
  }
  return (
    <AuthDataContext.Provider value={value}>
      {children}
    </AuthDataContext.Provider>
  )
}

export default AuthContext