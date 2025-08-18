// /contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { setAuthToken } from '../services/api/github';
import authService from '../services/api/auth';
import { logInfo, logError, trackError, ErrorCategory } from '../utils/logger';

// API base URL configuration
// Use relative URLs if REACT_APP_BACKEND_URL is not set (for production with proxy)
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL !== undefined 
  ? process.env.REACT_APP_BACKEND_URL 
  : 'http://localhost:5000';

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear session and log out
  const logout = useCallback(async () => {
    try {
      // Call server-side logout endpoint
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
      
      // Reset client-side state
      setUser(null);
      setToken(null);
      setError(null);
      
      // Clear token from API service
      setAuthToken(null);
      
      // SECURITY: Dispatch logout event to clear caches
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      
      // Clear any stored tokens from localStorage
      localStorage.removeItem('github_token');
      localStorage.removeItem('gist_manager_session');
      
      logInfo('User logged out successfully');
    } catch (error) {
      logError('Logout error:', { error: error.message });
    }
  }, []);

  // Fetch the current authenticated user
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
  
    try {
      setLoading(true);
      
      // Use authService to get user data
      const userData = await authService.getCurrentUser();
      
      // If userData has email or we got the data we need, just use it
      setUser(userData);
      setError(null);
    } catch (error) {
      console.error('Error fetching user:', error.message);
      setError('Failed to retrieve user information');
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  // Check authentication status on application load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // Check if we have a token in localStorage (for backward compatibility)
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
          setToken(savedToken);
          setAuthToken(savedToken);
          await fetchUser();
          return;
        }
        
        // Otherwise check server-side session
        const { data } = await axios.get(`${API_BASE_URL}/api/auth/status`, { withCredentials: true });
        
        if (data.authenticated && data.user) {
          setUser(data.user);
          // We don't need to set a token here as the server-side session handles authentication
          logInfo('Authenticated via server session');
        }
      } catch (error) {
        logError('Error checking authentication status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [fetchUser]);

  // Set up listener for token invalid events from API calls
  useEffect(() => {
    const handleTokenInvalid = () => {
      logInfo('Received token_invalid event, logging out');
      trackError(new Error('Token became invalid'), ErrorCategory.AUTHENTICATION, {
        action: 'auto_logout',
        reason: 'token_invalid_event'
      });
      logout();
    };

    window.addEventListener('auth:token_invalid', handleTokenInvalid);

    return () => {
      window.removeEventListener('auth:token_invalid', handleTokenInvalid);
    };
  }, [logout]);

  const initiateGithubLogin = useCallback(async () => {
    try {
      // Get auth URL from server (which handles state)
      const response = await axios.get(`${API_BASE_URL}/api/auth/github/login`, { 
        params: {
          scopes: 'gist user user:email'  // Add user:email scope for email access
        },
        withCredentials: true 
      });
      
      if (!response.data || !response.data.url) {
        throw new Error('Invalid response from server');
      }
      
      // Store state in sessionStorage as backup
      if (response.data.state) {
        sessionStorage.setItem('oauth_state', response.data.state);
      }
      
      // Redirect to GitHub
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
      const errorMsg = `Failed to initiate GitHub login: ${error.message}`;
      setError(errorMsg);
      // Also show alert for immediate visibility
      alert(errorMsg);
    }
  }, []);

  // Login with authorization code
  const login = async (code, state) => {
    try {
      setLoading(true);
      setError(null);
      
      // Exchange code for token (server validates state)
      const response = await axios.post(`${API_BASE_URL}/api/auth/github`, 
        { code, state }, 
        { withCredentials: true }
      );
      
      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server');
      }
      
      // Set token in memory
      const authToken = response.data.access_token;
      setToken(authToken);
      setAuthToken(authToken);
      
      // Fetch user data with token
      await fetchUser();
      
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Authentication failed';
      logError('Login error:', { message: errorMessage, error });
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Value object to provide through the context
  const contextValue = {
    user,
    token,
    login,
    logout,
    loading,
    error,
    initiateGithubLogin,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;