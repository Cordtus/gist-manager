// services/api/auth.js

import axios from 'axios';
import { setAuthToken } from './github';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

/**
 * Authenticate with GitHub by exchanging an authorization code for an access token
 * 
 * @param {string} code - The authorization code from GitHub OAuth redirect
 * @param {string} state - The state parameter for CSRF protection
 * @param {Object} options - Additional options for authentication
 * @returns {Promise<string>} - The access token
 */
export const authenticateWithGitHub = async (code, state, options = {}) => {
  try {
    console.log(`Authenticating with GitHub: code=${code?.substring(0, 5)}..., state=${state}, options=`, options);
    
    // Include the state parameter and any additional options in the request to the server
    const requestData = { 
      code, 
      state,
      ...options
    };
    
    console.log('Sending authentication request to server:', requestData);
    
    // Send the request to the server
    const response = await axios.post(`${API_BASE_URL}/api/auth/github`, requestData);
    
    // Check if we have a valid response with an access token
    if (!response.data || !response.data.access_token) {
      console.error('No access token in response:', response.data);
      throw new Error('No access token received from server');
    }
    
    const accessToken = response.data.access_token;
    console.log('Successfully received access token');
    
    // Set the token for future API requests
    setAuthToken(accessToken);
    
    return accessToken;
  } catch (error) {
    console.error('GitHub authentication error:', error);
    
    // Provide more specific error messages based on the response
    if (error.response) {
      console.error('Error response data:', error.response.data);
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.error || 'Unknown server error';
      const detailMessage = error.response.data?.message || '';
      
      throw new Error(`Server error (${statusCode}): ${errorMessage}${detailMessage ? ` - ${detailMessage}` : ''}`);
    } else if (error.request) {
      throw new Error('No response received from the server. Please check your network connection.');
    } else {
      throw error; // Re-throw the original error if it's not related to the request/response
    }
  }
};

/**
 * Get the current authenticated user from GitHub
 * 
 * @returns {Promise<Object>} - The user data
 */
export const getCurrentUser = async () => {
  try {
    // Try to get token from localStorage first, then sessionStorage as fallback
    const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_token');

    if (!token) {
      throw new Error('No authentication token found in browser storage');
    }

    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication token is invalid or expired. Please log in again.');
    } else if (error.response) {
      throw new Error(`GitHub API error: ${error.response.data?.message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error('No response received from GitHub. Please check your network connection.');
    } else {
      throw error;
    }
  }
};

export default {
  authenticateWithGitHub,
  getCurrentUser
};