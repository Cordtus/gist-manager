// services/api/auth.js

import axios from 'axios';
import { setAuthToken } from './github';
import { logInfo, logError, logWarning, trackError, ErrorCategory } from '../../utils/logger';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';

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
    const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH_GITHUB}`, requestData);
       
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

/**
 * Generate a secure random state parameter for OAuth
 *
 * @returns {string} - Random state string
 */
export const generateOAuthState = () => {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for tests/SSR
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate redirect URI to prevent open redirects
 *
 * @param {string} uri - Redirect URI to validate
 * @returns {boolean} - Whether the URI is valid
 */
export const isValidRedirectUri = (uri) => {
  try {
    const url = new URL(uri);
    const allowedOrigins = [
      window.location.origin,
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.REACT_APP_REDIRECT_URI
    ].filter(Boolean);

    return allowedOrigins.some(origin => url.origin === origin || uri.startsWith(origin));
  } catch (error) {
    logError('Invalid redirect URI', { uri });
    return false;
  }
};

/**
 * Initiate GitHub OAuth login flow
 *
 * @param {Object} options - OAuth options
 * @returns {string} - OAuth authorization URL
 */
export const initiateGitHubLogin = (options = {}) => {
  const state = generateOAuthState();
  const redirectUri = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/callback`;

  if (!isValidRedirectUri(redirectUri)) {
    throw new Error('Invalid redirect URI');
  }

  // Store state in sessionStorage for verification
  sessionStorage.setItem('oauth_state', state);

  const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  const scope = options.scope || 'gist user';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  logInfo('Initiating GitHub OAuth login', { redirectUri, scope });

  return authUrl;
};

/**
 * Handle OAuth callback with authorization code
 *
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @returns {Promise<Object>} - Auth result with access_token and user
 */
export const handleOAuthCallback = async (code, state) => {
  try {
    logInfo('Handling OAuth callback');

    // Verify state parameter
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Clear state from storage
    sessionStorage.removeItem('oauth_state');

    // Exchange code for token
    const accessToken = await authenticateWithGitHub(code, state);

    // Store token
    localStorage.setItem('github_token', accessToken);

    // Create session
    const sessionData = {
      token: accessToken,
      expiration: new Date().getTime() + (24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

    // Fetch user data
    const user = await getCurrentUser();

    logInfo('OAuth callback completed successfully', { username: user.login });

    return { access_token: accessToken, user };
  } catch (error) {
    logError('OAuth callback error', { error: error.message });
    throw error;
  }
};

/**
 * Handle OAuth callback with retry logic
 *
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Object>} - Auth result
 */
export const handleOAuthCallbackWithRetry = async (code, state, maxRetries = 3) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await handleOAuthCallback(code, state);
    } catch (error) {
      lastError = error;
      logWarning(`OAuth callback attempt ${attempt + 1} failed`, { error: error.message });

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
};

/**
 * Handle OAuth errors
 *
 * @param {string} error - Error code
 * @param {string} errorDescription - Error description
 */
export const handleOAuthError = (error, errorDescription) => {
  logError('OAuth error', { error, errorDescription });
  throw new Error(`OAuth error: ${error} - ${errorDescription || 'Unknown error'}`);
};

/**
 * Check if user is authenticated
 *
 * @returns {boolean} - Whether user is authenticated
 */
export const isAuthenticated = () => {
  try {
    const sessionData = localStorage.getItem('gist_manager_session');
    if (!sessionData) {
      return false;
    }

    const { expiration } = JSON.parse(sessionData);
    return expiration && new Date().getTime() < expiration;
  } catch (error) {
    logError('Error checking authentication', { error: error.message });
    return false;
  }
};

/**
 * Check if session is expired
 *
 * @returns {boolean} - Whether session is expired
 */
export const isSessionExpired = () => {
  try {
    const sessionData = localStorage.getItem('gist_manager_session');
    if (!sessionData) {
      return true;
    }

    const { expiration } = JSON.parse(sessionData);
    return !expiration || new Date().getTime() >= expiration;
  } catch (error) {
    logError('Error checking session expiration', { error: error.message });
    return true;
  }
};

/**
 * Refresh token if needed
 *
 * @returns {Promise<boolean>} - Whether token was refreshed
 */
export const refreshTokenIfNeeded = async () => {
  try {
    const sessionData = localStorage.getItem('gist_manager_session');
    if (!sessionData) {
      return false;
    }

    const { expiration } = JSON.parse(sessionData);
    const timeUntilExpiry = expiration - new Date().getTime();

    // Refresh if less than 1 hour remaining
    if (timeUntilExpiry < 60 * 60 * 1000) {
      logInfo('Token refresh needed');
      // GitHub tokens don't expire, but we can extend our session
      const sessionUpdate = {
        ...JSON.parse(sessionData),
        expiration: new Date().getTime() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem('gist_manager_session', JSON.stringify(sessionUpdate));
      return true;
    }

    return false;
  } catch (error) {
    logError('Error refreshing token', { error: error.message });
    return false;
  }
};

/**
 * Logout user and clear session
 */
export const logout = () => {
  try {
    logInfo('Logging out user');

    // Clear tokens
    localStorage.removeItem('github_token');
    localStorage.removeItem('gist_manager_session');
    sessionStorage.clear();

    // Clear auth headers
    setAuthToken(null);

    // Dispatch logout event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    logInfo('User logged out successfully');
  } catch (error) {
    logError('Error during logout', { error: error.message });
    // Continue logout even if there's an error
  }
};

/**
 * Clear session data
 */
export const clearSession = () => {
  try {
    localStorage.removeItem('gist_manager_session');
    sessionStorage.clear();
    logInfo('Session cleared');
  } catch (error) {
    logError('Error clearing session', { error: error.message });
  }
};

/**
 * Save session data
 *
 * @param {Object} sessionData - Session data to save
 */
export const saveSession = (sessionData) => {
  try {
    localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));
    logInfo('Session saved');
  } catch (error) {
    logError('Error saving session', { error: error.message });
    throw error;
  }
};

/**
 * Check if user has required scopes
 *
 * @param {Array<string>} requiredScopes - Required scopes
 * @returns {Promise<boolean>} - Whether user has required scopes
 */
export const hasRequiredScopes = async (requiredScopes) => {
  try {
    const token = localStorage.getItem('github_token');
    if (!token) {
      return false;
    }

    // GitHub doesn't provide a direct way to check scopes from the client
    // We'd need to store them when we get the token
    const sessionData = localStorage.getItem('gist_manager_session');
    if (sessionData) {
      const { scopes } = JSON.parse(sessionData);
      if (scopes) {
        return requiredScopes.every(scope => scopes.includes(scope));
      }
    }

    // If we don't have scope info, assume we have the scopes
    return true;
  } catch (error) {
    logError('Error checking scopes', { error: error.message });
    return false;
  }
};

/**
 * Ensure user has required scopes, redirect to auth if not
 *
 * @param {Array<string>} requiredScopes - Required scopes
 * @returns {Promise<boolean>} - Whether user has required scopes
 */
export const ensureScopes = async (requiredScopes) => {
  const hasScopes = await hasRequiredScopes(requiredScopes);

  if (!hasScopes) {
    logWarning('Missing required scopes, initiating re-authentication', { requiredScopes });
    const authUrl = initiateGitHubLogin({ scope: requiredScopes.join(' ') });

    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }

    return false;
  }

  return true;
};

/**
 * Get API rate limit status
 *
 * @returns {Promise<Object>} - Rate limit info
 */
export const getRateLimitStatus = async () => {
  try {
    const token = localStorage.getItem('github_token');
    const response = await axios.get('https://api.github.com/rate_limit', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    return response.data.rate;
  } catch (error) {
    logError('Error fetching rate limit status', { error: error.message });
    throw error;
  }
};

/**
 * Make an authenticated request with rate limit handling
 *
 * @param {Function} requestFn - Function that makes the request
 * @returns {Promise<any>} - Request result
 */
export const makeAuthenticatedRequest = async (requestFn) => {
  try {
    // Check rate limit before making request
    const rateLimit = await getRateLimitStatus();

    if (rateLimit.remaining < 10) {
      logWarning('Rate limit running low', { remaining: rateLimit.remaining });
    }

    if (rateLimit.remaining === 0) {
      const resetDate = new Date(rateLimit.reset * 1000);
      throw new Error(`Rate limit exceeded. Resets at ${resetDate.toISOString()}`);
    }

    return await requestFn();
  } catch (error) {
    logError('Authenticated request failed', { error: error.message });
    throw error;
  }
};

const authService = {
  authenticateWithGitHub,
  getCurrentUser,
  validateToken,
  generateOAuthState,
  isValidRedirectUri,
  initiateGitHubLogin,
  handleOAuthCallback,
  handleOAuthCallbackWithRetry,
  handleOAuthError,
  isAuthenticated,
  isSessionExpired,
  refreshTokenIfNeeded,
  logout,
  clearSession,
  saveSession,
  hasRequiredScopes,
  ensureScopes,
  getRateLimitStatus,
  makeAuthenticatedRequest
};

export default authService;