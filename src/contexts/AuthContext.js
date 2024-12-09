// /contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api, githubApi, setAuthToken } from '../services/api/github';

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user details
  const [token, setToken] = useState(null); // Store token in memory (not localStorage)
  const [loading, setLoading] = useState(true); // Loading state for authentication

  // Logout function to clear tokens and reset user state
  const logout = useCallback(() => {
    console.log('Logging out...');
    localStorage.removeItem('oauth_state'); // Remove OAuth state from localStorage
    localStorage.removeItem('github_token'); // Remove token from localStorage
    setUser(null); // Reset user state
    setToken(null); // Clear token from memory
    setAuthToken(null); // Clear token from API service
  }, []);

  // Fetch the current authenticated user directly from GitHub
  const fetchUser = useCallback(async () => {
    if (!token) return; // If no token, skip fetching user

    try {
      const response = await githubApi.get('/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('User fetched successfully:', response.data);
      setUser(response.data); // Set user data in state
    } catch (error) {
      console.error('Error fetching user:', error);
      logout(); // Logout on error
    } finally {
      setLoading(false); // Stop loading after fetching user data
    }
  }, [token, logout]);

  // Check if a token exists in local storage and fetch user data if it does
  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    console.log('Stored Token:', storedToken);

    if (storedToken) {
      setToken(storedToken); // Set token in memory
      setAuthToken(storedToken); // Set the token in the API service for future requests

      fetchUser()
        .then(() => console.log('User data fetched successfully'))
        .catch((error) => console.error('Error fetching user data:', error));
    } else {
      console.warn('No token found in localStorage.');
      setLoading(false); // No token means no need to fetch user data
    }
    // Remove setAuthToken from the dependency array
  }, [fetchUser]);

  // Function to initiate GitHub login by redirecting to GitHub's OAuth page
  const initiateGithubLogin = () => {
    const state = generateRandomString(32); // Generate random state string for security (CSRF protection)
    localStorage.setItem('oauth_state', state); // Save state to validate later

    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
      redirect_uri: process.env.REACT_APP_REDIRECT_URI,
      scope: 'gist user', // Request necessary scopes (e.g., access to gists)
      state,
    });

    console.log('Redirecting to GitHub OAuth...');
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  // Function to handle login after receiving authorization code and state from GitHub
  const login = async (code, state) => {
    try {
      const savedState = localStorage.getItem('oauth_state'); // Retrieve saved OAuth state

      if (!state || state !== savedState) {
        throw new Error('Invalid state parameter'); // Validate the state parameter to prevent CSRF attacks
      }

      localStorage.removeItem('oauth_state'); // Remove used OAuth state

      // Exchange authorization code for access token via backend API call
      const response = await api.post('/api/auth/github', { code });

      const { access_token } = response.data;

      if (!access_token) throw new Error('No access token received');

      setToken(access_token); // Store access token in memory (not localStorage)
      setAuthToken(access_token); // Set token for future API requests

      console.log('Login successful, fetching user...');
      await fetchUser(); // Fetch user details with the new token

      return true; // Return success
    } catch (error) {
      console.error('Login error:', error);
      logout(); // Logout on failure (e.g., invalid code or state)

      return false; // Return failure status
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        initiateGithubLogin,
        isAuthenticated: () => !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

// Helper function to generate a random string (used for OAuth state)
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
};
