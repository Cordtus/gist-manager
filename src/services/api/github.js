// services/api/github.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; 

// Create an Axios instance for both backend and GitHub API requests.
const api = axios.create({
  baseURL: API_BASE_URL,
});

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

// Set Authorization header globally for both APIs.
export const setAuthToken = (token) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};


export { githubApi, api };