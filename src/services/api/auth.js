// services/api/auth.js

import axios from 'axios';

// Base URLs for APIs
const API_BASE_URL = 'http://localhost:5000';
const GITHUB_API_BASE_URL = 'https://api.github.com';

// Create Axios instances
export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const githubApi = axios.create({
  baseURL: GITHUB_API_BASE_URL,
});

// Attach interceptors for debugging
githubApi.interceptors.request.use((config) => {
  console.log('Making API request', { url: config.url, method: config.method });
  return config;
});

githubApi.interceptors.response.use(
  (response) => {
    console.log('API response success', { data: response.data });
    return response;
  },
  (error) => {
    console.error('API response error', { status: error.response?.status, data: error.response?.data });
    return Promise.reject(error);
  }
);

// Generate the GitHub OAuth URL
export const generateGitHubOAuthUrl = () => {
  const state = generateRandomString(32); // Generate a secure random state
  localStorage.setItem('oauth_state', state); // Save the state in localStorage for validation
  console.log('Generated state:', state); // Debugging
  
  const params = new URLSearchParams({
    client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
    redirect_uri: process.env.REACT_APP_REDIRECT_URI,
    scope: 'gist user',
    state, // Include the generated state
  });
  
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

// Authenticate with GitHub using the provided code
export const authenticateWithGitHub = async (code) => {
  try {
    const state = localStorage.getItem('oauth_state'); // Retrieve the saved state
    if (!state) throw new Error('No state found in localStorage for validation.');

    console.log('Authenticating with GitHub', { code, state });

    const response = await api.post('/api/auth/github', { code, state });
    console.log('GitHub authentication success:', response.data);

    const { access_token } = response.data;
    if (!access_token) throw new Error('No access token received');

    localStorage.removeItem('oauth_state'); // Clear the state after successful authentication
    localStorage.setItem('github_token', access_token);
    setAuthToken(access_token); // Set the token for API instances
    return access_token;
  } catch (error) {
    console.error('Error during GitHub authentication:', error.response?.data || error.message);
    throw error;
  }
};

// Get the currently authenticated user's information
export const getCurrentUser = async () => {
  try {
    const response = await githubApi.get('/user');
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

// Logout the user and clear tokens
export const logout = () => {
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('github_token');
  setAuthToken(null);
};

// Set or remove the Authorization token for API requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete githubApi.defaults.headers.common['Authorization'];
  }
};

// Initiate GitHub Login by redirecting the user
export const initiateGithubLogin = () => {
  const state = generateRandomString(32); // Generate a secure random state
  localStorage.setItem('oauth_state', state); // Save the state for validation

  const params = new URLSearchParams({
    client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
    redirect_uri: process.env.REACT_APP_REDIRECT_URI,
    scope: 'gist user',
    state, // Include the generated state
  });

  const loginUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  console.log('Redirecting to GitHub login:', loginUrl); // Debugging
  window.location.href = loginUrl; // Redirect the user
};

// Generate a random string for state parameter
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
};
