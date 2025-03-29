// services/api/github.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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
  (response) => response,
  async (error) => {
    // Handle rate limiting
    if (error.response?.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
      console.warn('GitHub API rate limit exceeded');
      // You could implement retry logic with backoff here
    }
    
    // Handle unauthorized errors (invalid/expired token)
    if (error.response?.status === 401) {
      console.error('Unauthorized GitHub API request - token may be invalid');
      // Clear the token if it's invalid
      sessionStorage.removeItem('github_token');
      // You could trigger a logout action here
    }
    
    return Promise.reject(error);
  }
);

// Interceptor to automatically add Authorization header with token from sessionStorage
githubApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('github_token');

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
    // Store the token in sessionStorage
    sessionStorage.setItem('github_token', token);
    
    // Set token in both API instances
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('Auth token set for API requests');
  } else {
    // Remove token
    sessionStorage.removeItem('github_token');
    
    // Remove Authorization header if no token
    delete api.defaults.headers.common['Authorization'];
    delete githubApi.defaults.headers.common['Authorization'];
    
    console.log('Auth token cleared from API requests');
  }
};