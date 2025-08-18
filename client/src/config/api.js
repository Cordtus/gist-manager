// Centralized API configuration

// API base URL - uses relative URLs in production
export const API_BASE_URL = 
  process.env.REACT_APP_BACKEND_URL === undefined || 
  process.env.REACT_APP_BACKEND_URL === 'undefined' || 
  process.env.REACT_APP_BACKEND_URL === ''
    ? '' // Use relative URLs
    : process.env.REACT_APP_BACKEND_URL;

// GitHub OAuth configuration
export const GITHUB_CONFIG = {
  clientId: process.env.REACT_APP_GITHUB_CLIENT_ID,
  redirectUri: process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/callback`,
  scopes: 'gist user user:email'
};

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_STATUS: '/api/auth/status',
  AUTH_LOGIN: '/api/auth/github/login',
  AUTH_GITHUB: '/api/auth/github',
  
  // Gist endpoints
  GISTS: '/api/gists',
  
  // Shared gists endpoints
  SHARED_GISTS: '/api/shared-gists'
};

// Request configuration
export const REQUEST_CONFIG = {
  withCredentials: true,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
};

// GitHub API configuration
export const GITHUB_API = {
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json'
  }
};