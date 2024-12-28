// src/contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { githubApi, setAuthToken } from '../services/api/auth.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('github_token');
    setUser(null);
    setToken(null);
    setAuthToken(null);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await githubApi.get('/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken); // Set token for API requests
      fetchUser();
    }
    setLoading(false);
  }, [fetchUser]);

  const initiateGithubLogin = () => {
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
      redirect_uri: process.env.REACT_APP_REDIRECT_URI,
      scope: 'gist user',
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: fetchUser, // Use fetchUser to update user state after login
        logout,
        initiateGithubLogin,
        isAuthenticated: () => !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
