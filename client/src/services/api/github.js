// services/api/github.js
import axios from 'axios';
import { logInfo, logError, logWarning } from '../../utils/logger';
import { API_BASE_URL, GITHUB_API } from '../../config/api';

// Create an Axios instance for backend requests
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in cross-origin requests
});

// Create an Axios instance for GitHub API requests
export const githubApi = axios.create(GITHUB_API);

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

/**
 * Get the current authenticated user
 *
 * @returns {Promise<Object>} - User object
 */
export const getCurrentUser = async () => {
  try {
    logInfo('Fetching current user');
    const response = await githubApi.get('/user');
    logInfo('Successfully fetched current user');
    return response.data;
  } catch (error) {
    logError('Error fetching current user', { error: error.message });
    throw error;
  }
};

/**
 * Get all gists for a user
 *
 * @param {string} username - GitHub username
 * @param {Object} options - Query options (per_page, page)
 * @returns {Promise<Array>} - Array of gists
 */
export const getUserGists = async (username, options = {}) => {
  try {
    logInfo('Fetching user gists', { username, options });
    const params = {
      per_page: options.per_page || 100,
      ...options
    };

    const response = await githubApi.get(`/users/${username}/gists`, { params });
    logInfo('Successfully fetched user gists', { count: response.data.length });
    return response.data;
  } catch (error) {
    logError('Error fetching user gists', { username, error: error.message });
    throw error;
  }
};

/**
 * Get a single gist by ID
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<Object>} - Gist object
 */
export const getGist = async (gistId) => {
  try {
    logInfo('Fetching gist', { gistId });
    const response = await githubApi.get(`/gists/${gistId}`);
    logInfo('Successfully fetched gist');
    return response.data;
  } catch (error) {
    logError('Error fetching gist', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Create a new gist
 *
 * @param {Object} gistData - Gist data (description, files, public)
 * @returns {Promise<Object>} - Created gist object
 */
export const createGist = async (gistData) => {
  try {
    logInfo('Creating gist', { description: gistData.description });
    const response = await githubApi.post('/gists', gistData);
    logInfo('Successfully created gist', { gistId: response.data.id });
    return response.data;
  } catch (error) {
    logError('Error creating gist', { error: error.message });
    throw error;
  }
};

/**
 * Update an existing gist
 *
 * @param {string} gistId - Gist ID
 * @param {Object} gistData - Updated gist data
 * @returns {Promise<Object>} - Updated gist object
 */
export const updateGist = async (gistId, gistData) => {
  try {
    logInfo('Updating gist', { gistId });
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    logInfo('Successfully updated gist');
    return response.data;
  } catch (error) {
    logError('Error updating gist', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Delete a gist
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<void>}
 */
export const deleteGist = async (gistId) => {
  try {
    logInfo('Deleting gist', { gistId });
    await githubApi.delete(`/gists/${gistId}`);
    logInfo('Successfully deleted gist');
  } catch (error) {
    logError('Error deleting gist', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Star a gist
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<void>}
 */
export const starGist = async (gistId) => {
  try {
    logInfo('Starring gist', { gistId });
    await githubApi.put(`/gists/${gistId}/star`);
    logInfo('Successfully starred gist');
  } catch (error) {
    logError('Error starring gist', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Unstar a gist
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<void>}
 */
export const unstarGist = async (gistId) => {
  try {
    logInfo('Unstarring gist', { gistId });
    await githubApi.delete(`/gists/${gistId}/star`);
    logInfo('Successfully unstarred gist');
  } catch (error) {
    logError('Error unstarring gist', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Check if a gist is starred
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<boolean>} - Whether the gist is starred
 */
export const isGistStarred = async (gistId) => {
  try {
    logInfo('Checking if gist is starred', { gistId });
    await githubApi.get(`/gists/${gistId}/star`);
    logInfo('Gist is starred');
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      logInfo('Gist is not starred');
      return false;
    }
    logError('Error checking if gist is starred', { gistId, error: error.message });
    throw error;
  }
};

/**
 * Fork a gist
 *
 * @param {string} gistId - Gist ID
 * @returns {Promise<Object>} - Forked gist object
 */
export const forkGist = async (gistId) => {
  try {
    logInfo('Forking gist', { gistId });
    const response = await githubApi.post(`/gists/${gistId}/forks`);
    logInfo('Successfully forked gist', { newGistId: response.data.id });
    return response.data;
  } catch (error) {
    logError('Error forking gist', { gistId, error: error.message });
    throw error;
  }
};

const githubService = {
  api,
  githubApi,
  setAuthToken,
  validateToken,
  getCurrentUser,
  getUserGists,
  getGist,
  createGist,
  updateGist,
  deleteGist,
  starGist,
  unstarGist,
  isGistStarred,
  forkGist
};

export default githubService;