// services/api/github.js
import axios from 'axios';
import { logInfo, logError, logWarning } from '../../utils/logger';

// Use relative URLs if REACT_APP_BACKEND_URL is not set (for production with proxy)
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL !== undefined 
  ? process.env.REACT_APP_BACKEND_URL 
  : 'http://localhost:5000';

// Create an Axios instance for backend requests
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in cross-origin requests
});

// Create an Axios instance for GitHub API requests
export const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

// Add request interceptor to handle errors and retries
githubApi.interceptors.response.use(
  (response) => {
    // Log rate limit information in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      const rateLimit = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'] 
          ? new Date(response.headers['x-ratelimit-reset'] * 1000).toISOString()
          : 'unknown'
      };
      
      // Only log if we're getting close to the limit (less than 10% remaining)
      if (rateLimit.limit && rateLimit.remaining && 
          (parseInt(rateLimit.remaining) / parseInt(rateLimit.limit)) < 0.1) {
        logWarning('GitHub API rate limit running low', rateLimit);
      }
    }
    
    return response;
  },
  (error) => {
    // Handle rate limiting
    if (error.response?.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'] 
        ? new Date(error.response.headers['x-ratelimit-reset'] * 1000)
        : new Date(Date.now() + 60000); // Default to 1 minute if no reset time
      
      const rateLimitInfo = {
        resetTime: resetTime.toISOString(),
        retryAfter: Math.ceil((resetTime - new Date()) / 1000) + ' seconds'
      };
      
      logWarning('GitHub API rate limit exceeded', rateLimitInfo);
    }
    
    // Handle unauthorized errors (invalid/expired token)
    if (error.response?.status === 401) {
      logError('Unauthorized GitHub API request - token may be invalid');
      
      // Clear tokens from storage
      localStorage.removeItem('github_token');
      localStorage.removeItem('gist_manager_session');
      
      // Dispatch a custom event that AuthContext can listen for
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:token_invalid'));
      }
    }
    
    return Promise.reject(error);
  }
);

// Interceptor to automatically add Authorization header with token
githubApi.interceptors.request.use((config) => {
  // First try to get token from sessionStorage (more secure)
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
  } catch (error) {
    logError('Error retrieving token from session data', { error: error.message });
  }
  
  // Fallback to direct token retrieval
  if (!token) {
    token = localStorage.getItem('github_token');
  }

  if (token) {
    // Use Bearer authentication for GitHub API
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper function to set Authorization header globally for both APIs
export const setAuthToken = (token) => {
  if (token) {
    // Set token in both API instances
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    logInfo('Auth token set for API requests');
  } else {
    // Remove Authorization header if no token
    delete api.defaults.headers.common['Authorization'];
    delete githubApi.defaults.headers.common['Authorization'];
    
    logInfo('Auth token cleared from API requests');
  }
};

/**
 * Check if the current token is valid
 * 
 * @returns {Promise<boolean>} - Whether the token is valid
 */
export const validateToken = async () => {
  try {
    logInfo('Validating GitHub token');
    await githubApi.get('/user');
    logInfo('GitHub token is valid');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      logWarning('GitHub token validation failed - token is invalid');
      return false;
    }
    
    // For other errors, we'll assume the token might still be valid
    // but there was another issue with the request
    logError('Error validating GitHub token', { error: error.message });
    return true;
  }
};

const githubService = {
  api,
  githubApi,
  setAuthToken,
  validateToken
};

export default githubService;