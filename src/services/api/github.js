import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
});

export const setAuthToken = (token) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  githubApi.defaults.headers.common['Authorization'] = `token ${token}`;
};

const handleApiError = (error) => {
  console.error('API Error:', error);
  if (error.response) {
    throw new Error(error.response.data.message || 'An error occurred');
  } else if (error.request) {
    throw new Error('No response received from the server');
  } else {
    throw new Error('Error setting up the request');
  }
};

export const getGists = async () => {
  try {
    const response = await githubApi.get('/gists');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getGist = async (id) => {
  try {
    const response = await githubApi.get(`/gists/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createGist = async (gistData) => {
  try {
    const response = await githubApi.post('/gists', gistData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateGist = async (id, gistData) => {
  try {
    const response = await githubApi.patch(`/gists/${id}`, gistData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteGist = async (id) => {
  try {
    await githubApi.delete(`/gists/${id}`);
  } catch (error) {
    handleApiError(error);
  }
};

export { api, githubApi };