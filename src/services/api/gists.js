// services/api/gists.js

import axios from 'axios';
import { githubApi } from './github';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; 

// Create an Axios instance for both backend and GitHub API requests.
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Handle errors globally.
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) throw new Error(error.response.data.message || 'An error occurred');
  
  if (error.request) throw new Error('No response received from server');
  
  throw new Error('Error setting up request');
};

// GitHub-specific functions.
export const getGists = async () => {
  try {
    const response = await api.get('/gists');
    return response.data;
  } catch (error) {
    handleApiError(error);
    console.error('Error - No gists found:', error);
    throw error;
  }
};

export const getGist = async (id) => {
  try {
    const response = await api.get(`/gists/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    console.error('Error fetching gist:', error);
    throw error;
  }
};

export const createGist = async (gistData) => {
  try {
    const response = await githubApi.post('/gists', gistData);
    return response.data;
  } catch (error) {
    handleApiError(error);
    console.error('Error creating gist:', error);
    throw error;
  }
};

export const updateGist = async (gistId, gistData) => {
  try {
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    return response.data;
  } catch (error) {
    handleApiError(error);
    console.error('Error updating gist:', error);
    throw error;
  }
};

export const deleteGist = async (gistId) => {
  try {
    await githubApi.delete(`/gists/${gistId}`);
  } catch (error) {
    handleApiError(error);
    console.error('Error deleting gist:', error);
    throw error;
  }
};