// AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { setAuthToken, api } from '../services/api/github';

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // Store user details
  const [loading, setLoading] = useState(true);  // Loading state for authentication

  // Log client ID and redirect URI for debugging purposes
  useEffect(() => {
    console.log('Client ID:', process.env.REACT_APP_GITHUB_CLIENT_ID);
    console.log('Redirect URI:', process.env.REACT_APP_REDIRECT_URI);
  }, []);

  // Logout function to clear tokens and reset user state
  const logout = useCallback(() => {
    localStorage.removeItem('github_token');  // Remove GitHub token from localStorage
    localStorage.removeItem('oauth_state');   // Remove OAuth state from localStorage
    setUser(null);                            // Reset user state
    setAuthToken(null);                       // Clear token from API service
  }, []);

  // Fetch the current authenticated user directly from GitHub
  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${localStorage.getItem('github_token')}`,
        },
      });
      
      console.log('Fetched User Data:', response.data);  // Log user data

      setUser(response.data);  // Set user data in state
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();                                        // Logout on error
    } finally {
      setLoading(false);                               // Stop loading after fetching user data
    }
  }, [logout]);

  // Check if a token exists in local storage and fetch user data if it does
  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      setAuthToken(token);  // Set the token in the API service for future requests
      fetchUser();          // Fetch user details with the token
    } else {
      setLoading(false);    // No token means no need to fetch user data
    }
  }, [fetchUser]);

  // Function to initiate GitHub login by redirecting to GitHub's OAuth page
  const initiateGithubLogin = () => {
    const state = generateRandomString(32);            // Generate a random state string for security (CSRF protection)
    localStorage.setItem('oauth_state', state);        // Save state to validate later

    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,  // Use environment variable for client ID
      redirect_uri: process.env.REACT_APP_REDIRECT_URI,   // Use environment variable for redirect URI
      scope: 'gist user',                                // Request necessary scopes (e.g., access to gists)
      state: state,
    });

    console.log('Login URL:', `https://github.com/login/oauth/authorize?${params}`);
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;  // Redirect to GitHub OAuth page
  };

  // Function to handle login after receiving authorization code and state from GitHub
  const login = async (code, state) => {
    try {
      const savedState = localStorage.getItem('oauth_state');     // Retrieve saved OAuth state

      // Validate the state parameter to prevent CSRF attacks
      if (!state || state !== savedState) {
        throw new Error('Invalid state parameter');
      }

      localStorage.removeItem('oauth_state');                     // Remove used OAuth state

      // Exchange authorization code for access token via backend API
      const response = await api.post('/api/auth/github', { code });
      
      const { access_token } = response.data;
      
      if (!access_token) {
        throw new Error('No access token received');
      }

      localStorage.setItem('github_token', access_token);         // Store access token locally in browser storage
      setAuthToken(access_token);                                 // Set token for future API requests
      
      await fetchUser();                                          // Fetch user details with the new token
      
      return true;                                                // Return success
      
    } catch (error) {
      console.error('Login error:', error);
      logout();                                                   // Logout on failure (e.g., invalid code or state)
      
      return false;                                               // Return failure status
    }
  };

  // Helper function to generate a random string (used for OAuth state)
  const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
  };

  // Function to check if a user is authenticated by verifying if a token exists in localStorage
  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('github_token');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user,               // Current authenticated user's information
        login,              // Function to handle login after receiving authorization code and state from GitHub
        logout,             // Function to log out and clear tokens/user data
        loading,            // Loading status during authentication processes (e.g., fetching user data)
        initiateGithubLogin,// Function to initiate GitHub login by redirecting users to GitHub's OAuth page
        isAuthenticated     // Function to check if a user is authenticated based on presence of a valid token and user data
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;