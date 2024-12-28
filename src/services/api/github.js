// services/api/github.js

import axios from 'axios';

export const githubApi = axios.create({
  baseURL: 'https://api.github.com',
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
