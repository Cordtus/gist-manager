// services/api/auth.js

import axios from 'axios';

// Base URLs for APIs
const API_BASE_URL = 'http://localhost:5000';
const GITHUB_API_BASE_URL = 'https://api.github.com';

// Create Axios instances
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies with requests
});

export const githubApi = axios.create({
  baseURL: GITHUB_API_BASE_URL,
});

// Attach interceptors for debugging
githubApi.interceptors.request.use((config) => {
  console.log('[GitHub API] Request:', { url: config.url, method: config.method });
  return config;
});

githubApi.interceptors.response.use(
  (response) => {
    console.log('[GitHub API] Response Success:', { data: response.data });
    return response;
  },
  (error) => {
    console.error('[GitHub API] Response Error:', { status: error.response?.status, data: error.response?.data });
    return Promise.reject(error);
  }
);

// Authenticate with GitHub using the provided code
export const authenticateWithGitHub = async (code) => {
  try {
    console.log('[Auth] Authenticating with GitHub using code:', code);

    // Send code to backend for token exchange
    const response = await api.post('/api/auth/github', { code });
    const { access_token } = response.data;

    if (!access_token) {
      throw new Error('[Auth] No access token received from server.');
    }

    console.log('[Auth] GitHub authentication successful. Token retrieved:', access_token);

    // Save token to localStorage and set it for future requests
    localStorage.setItem('github_token', access_token);
    setAuthToken(access_token);

    return access_token;
  } catch (error) {
    console.error('[Auth] Error during GitHub authentication:', error.response?.data || error.message);
    throw error;
  }
};

// Get the currently authenticated user's information
export const getCurrentUser = async () => {
  try {
    console.log('[Auth] Fetching authenticated user information...');
    const response = await githubApi.get('/user');
    return response.data;
  } catch (error) {
    console.error('[Auth] Error fetching user information:', error);
    throw error;
  }
};

// Logout the user and clear tokens
export const logout = async () => {
  try {
    console.log('[Auth] Logging out...');
    await api.post('/api/auth/logout', {}, { withCredentials: true });

    // Clear local storage and remove Authorization headers
    localStorage.removeItem('github_token');
    setAuthToken(null);

    console.log('[Auth] Logout successful');
  } catch (error) {
    console.error('[Auth] Error during logout:', error);
  }
};

// Set or remove the Authorization token for API requests
export const setAuthToken = (token) => {
  if (token) {
    githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('[Auth] Authorization token set.');
  } else {
    delete githubApi.defaults.headers.common['Authorization'];
    console.log('[Auth] Authorization token removed.');
  }
};

// Generate a secure random state string
export const generateState = () => {
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  localStorage.setItem('oauth_state', state);
  console.log('[Auth] Generated and saved OAuth state:', state);
  return state;
};

// Validate the OAuth state
export const validateState = (receivedState) => {
  const savedState = localStorage.getItem('oauth_state');
  if (savedState !== receivedState) {
    console.warn('[Auth] State mismatch detected:', { savedState, receivedState });
    return false;
  }
  console.log('[Auth] State validated successfully.');
  localStorage.removeItem('oauth_state'); // Clear saved state after validation
  return true;
};
