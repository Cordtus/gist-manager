// src/contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { githubApi, setAuthToken, authenticateWithGitHub } from '../services/api/auth.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logout function
  const logout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) // Inform backend of logout
      .finally(() => {
        setUser(null);
        setAuthToken(null); // Clear tokens from the API service
      });
  }, []);

  // Fetch authenticated user info
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('github_token');
    if (!token) {
      console.log('[AuthContext] No token found. Skipping user fetch.');
      return;
    }

    try {
      const response = await githubApi.get('/user');
      setUser(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn('[AuthContext] Unauthorized access. Clearing token.');
        localStorage.removeItem('github_token'); // Clear invalid token
      } else {
        console.error('[AuthContext] Error fetching user:', error);
      }
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('github_token');
      if (token) {
        setAuthToken(token); // Set token for API calls
        await fetchUser();
      }
      setLoading(false); // Ensure loading state is cleared
    };

    initializeAuth();
  }, [fetchUser]);

  // Redirect to GitHub login (URL provided by backend)
  const initiateGithubLogin = async () => {
    try {
      const response = await fetch('/api/auth/github/login', { credentials: 'include' });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to GitHub OAuth
      } else {
        console.error('[AuthContext] GitHub login URL not provided by the server');
      }
    } catch (error) {
      console.error('[AuthContext] Error initiating GitHub login:', error);
    }
  };

  // Login using GitHub authorization code
  const login = async (code) => {
    try {
      const accessToken = await authenticateWithGitHub(code);
      if (accessToken) {
        localStorage.removeItem('oauth_state'); // Clear saved state
        setAuthToken(accessToken); // Set token for API requests
        await fetchUser(); // Fetch authenticated user
      }
    } catch (error) {
      console.error('[AuthContext] Login failed:', error.message);
    } finally {
      setLoading(false); // Ensure loading state is cleared
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        initiateGithubLogin,
        isAuthenticated: () => !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
