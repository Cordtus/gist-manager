// services/api/github.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Create an Axios instance for both backend and GitHub API requests.
export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const githubApi = axios.create({
  baseURL: 'https://api.github.com',
});

// Interceptor to automatically add Authorization header with token from localStorage
githubApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('github_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Helper function to set Authorization header globally for both APIs
export const setAuthToken = (token) => {
  if (token) {
    // Set Authorization header for both api and githubApi instances
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    // Remove Authorization header if no token
    delete api.defaults.headers.common['Authorization'];
    delete githubApi.defaults.headers.common['Authorization'];
  }
};
