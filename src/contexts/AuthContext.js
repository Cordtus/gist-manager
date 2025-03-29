// /contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { setAuthToken } from '../services/api/github';
import authService from '../services/api/auth';
import axios from 'axios';

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

// OAuth state storage key - using consistent key for localStorage (more persistent than sessionStorage)
const OAUTH_STATE_KEY = 'gist_manager_oauth_state';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // Store user details
  const [token, setToken] = useState(null);  // Store token in state
  const [loading, setLoading] = useState(true);  // Loading state for authentication
  const [error, setError] = useState(null);  // Store error messages

  // Logout function to clear tokens and reset user state
  const logout = useCallback(() => {
    // Clear tokens from storage
    localStorage.removeItem('github_token');
    localStorage.removeItem(OAUTH_STATE_KEY);
    
    // Reset state
    setUser(null);
    setToken(null);
    setError(null);
    
    // Clear token from API service
    setAuthToken(null);
    
    console.log('Logged out successfully');
  }, []);

  // Fetch the current authenticated user
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Failed to retrieve user information');
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  // Check if a token exists in localStorage and fetch user data if it does
  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    
    if (storedToken) {
      setToken(storedToken);     // Set token in memory
      setAuthToken(storedToken); // Set the token in the API service for future requests
      fetchUser();               // Fetch user details with the token
    } else {
      setLoading(false);         // No token means no need to fetch user data
    }
  }, [fetchUser]);

  // Function to generate a secure random string for state parameter
  const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
  };

  // Function to initiate GitHub login by redirecting to GitHub's OAuth page
  const initiateGithubLogin = useCallback(() => {
    try {
      // Generate a secure random state string to prevent CSRF attacks
      const state = generateRandomString(32);
      
      // Store state in localStorage for verification after OAuth redirect
      localStorage.setItem(OAUTH_STATE_KEY, state);
      
      console.log(`Generated OAuth state: ${state}`);
      console.log(`Saved state to localStorage with key: ${OAUTH_STATE_KEY}`);

      // Also save to sessionStorage as a fallback
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
      
      // Obtain the client ID and redirect URI from environment variables
      const githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
      const redirectUri = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/callback`;
      
      // Create GitHub OAuth URL with parameters
      const params = new URLSearchParams({
        client_id: githubClientId,
        redirect_uri: redirectUri,
        scope: 'gist user',  // Request access to user's gists
        state,
      });
      
      // For development/debugging - save state to a cookie as well
      document.cookie = `${OAUTH_STATE_KEY}=${state}; path=/; max-age=3600; SameSite=Lax`;
      
      // Log the complete URL for debugging
      const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      console.log(`Redirecting to GitHub OAuth URL: ${authUrl}`);
      
      // Redirect to GitHub for authorization
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
      setError(`Failed to initiate GitHub login: ${error.message}`);
    }
  }, []);

  // Function to handle login after receiving authorization code and state from GitHub
  const login = async (code, state) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check all possible storage locations for the state
      const savedStateLocal = localStorage.getItem(OAUTH_STATE_KEY);
      const savedStateSession = sessionStorage.getItem(OAUTH_STATE_KEY);
      
      // Try to get state from cookie as well
      const savedStateCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${OAUTH_STATE_KEY}=`))
        ?.split('=')[1];
      
      // Use any available state (prioritize localStorage)
      const savedState = savedStateLocal || savedStateSession || savedStateCookie;
      
      console.log(`Login: Comparing received state "${state}" with saved states:`, {
        localStorage: savedStateLocal,
        sessionStorage: savedStateSession,
        cookie: savedStateCookie,
        finalUsed: savedState
      });
      
      // If we can't find the state anywhere, log an error
      if (!savedState) {
        console.error('No saved OAuth state found in any storage location');
      }
      
      // Skip state validation if there's no saved state (for development only)
      const skipStateValidation = !savedState && process.env.NODE_ENV === 'development';
      
      // Validate state parameter to prevent CSRF attacks (unless skipped)
      if (!skipStateValidation) {
        if (!state) {
          const errorMsg = 'No state received from GitHub callback';
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        if (!savedState) {
          const errorMsg = 'No saved state found in browser storage';
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        if (state !== savedState) {
          const errorMsg = `Invalid state parameter: expected ${savedState}, got ${state}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('State validated successfully');
      } else {
        console.warn('State validation skipped (development mode or no saved state)');
      }
      
      // Clear the saved state from all storage locations
      localStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      document.cookie = `${OAUTH_STATE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      console.log('State cleared from all storage locations');
      
      // Add a special development flag to the server request to skip state validation
      // on the server side if we're skipping it on the client side
      const authOptions = skipStateValidation 
        ? { code, state, skipValidation: true }
        : { code, state };
      
      // Exchange authorization code for access token
      const authToken = await authService.authenticateWithGitHub(code, state, authOptions);
      
      if (!authToken) {
        throw new Error('No access token received');
      }
      
      // Store token in memory and localStorage
      setToken(authToken);
      localStorage.setItem('github_token', authToken);
      
      // Set token for API requests
      setAuthToken(authToken);
      
      // Fetch user details with the new token
      await fetchUser();
      
      return true;  // Return success status
      
    } catch (error) {
      console.error('Login error:', error);
      setError(`Authentication failed: ${error.message}`);
      logout();  // Logout on failure
      return false;  // Return failure status
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
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;