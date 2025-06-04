// services/api/auth.js

import axios from 'axios';
import { setAuthToken } from './github';
import { logInfo, logError, logWarning, trackError, ErrorCategory } from '../../utils/logger';

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
    logInfo(`Authenticating with GitHub: code=${code?.substring(0, 5)}..., state=${state}`);
    
    // Use explicit redirect URI if provided in env, otherwise use origin
    const redirectUri = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/callback`;
    
    // Include the redirect URI and any other options
    const requestData = { 
      code, 
      state,
      redirect_uri: redirectUri,
      ...options
    };
    
    logInfo('Sending authentication request to server', { redirectUri });
    
    // Send the request to the server
    const response = await axios.post(`${API_BASE_URL}/api/auth/github`, requestData);
       
    // Check if we have a valid response with an access token
    if (!response.data || !response.data.access_token) {
      const error = new Error('No access token received from server');
      logError('No access token in response', { responseData: JSON.stringify(response.data).substring(0, 200) });
      trackError(error, ErrorCategory.AUTHENTICATION, {
        step: 'exchangeToken',
        hasResponseData: !!response.data
      });
      throw error;
    }
    
    const accessToken = response.data.access_token;
    logInfo('Successfully received access token');
    
    // Set the token for future API requests
    setAuthToken(accessToken);
    
    return accessToken;
  } catch (error) {
    logError('GitHub authentication error', {
      message: error.message,
      status: error.response?.status
    });
    
    trackError(error, ErrorCategory.AUTHENTICATION, {
      step: 'authenticateWithGitHub',
      code: code ? `${code.substring(0, 5)}...` : 'none',
      hasState: !!state,
      status: error.response?.status
    });
    
    // Provide more specific error messages based on the response
    if (error.response) {
      logError('Error response data', { 
        data: JSON.stringify(error.response.data).substring(0, 200),
        status: error.response.status
      });
      
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
    let token = null;
    
    try {
      // Try to get token from session data first
      const sessionData = localStorage.getItem('gist_manager_session');
      if (sessionData) {
        const { token: sessionToken, expiration } = JSON.parse(sessionData);
        // Only use token if not expired
        if (expiration && new Date().getTime() < expiration) {
          token = sessionToken;
        }
      }
    } catch (e) {
      logError('Error retrieving token from session data', { error: e.message });
    }
    
    // Fallback to direct token retrieval
    if (!token) {
      token = localStorage.getItem('github_token');
    }

    if (!token) {
      const error = new Error('No authentication token found in browser storage');
      logError('No authentication token found');
      trackError(error, ErrorCategory.AUTHENTICATION, { step: 'getCurrentUser' });
      throw error;
    }

    logInfo('Fetching current user data from GitHub API');
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    logInfo('Successfully fetched user data', { username: response.data.login });
    return response.data;
  } catch (error) {
    logError('Error fetching current user', { error: error.message });
    
    trackError(error, ErrorCategory.AUTHENTICATION, {
      step: 'getCurrentUser',
      status: error.response?.status
    });
    
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

/**
 * Validate the current token by making a test request
 * 
 * @returns {Promise<boolean>} Whether the token is valid
 */
export const validateToken = async () => {
  try {
    logInfo('Validating current auth token');
    await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('github_token')}`,
      },
    });
    logInfo('Token validation successful');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      logWarning('Token validation failed - token is invalid or expired');
      return false;
    }
    logError('Error during token validation', { error: error.message });
    // For other errors, assume the token might still be valid
    return true;
  }
};

const authService = {
  authenticateWithGitHub,
  getCurrentUser,
  validateToken
};

export default authService;