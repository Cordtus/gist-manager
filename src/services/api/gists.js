// services/api/gists.js

import { handleApiError } from '../../utils/errorHandler.js'
import { githubApi } from './github';

// Fetch Gists from Backend or Directly from GitHub API
export const getGists = async () => {
  try {
    const response = await githubApi.get('/gists');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Fetch Single Gist by ID
export const getGist = async (id) => {
  try {
    const response = await githubApi.get(`/gists/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Create a New Gist
export const createGist = async (gistData) => {
  try {
    const response = await githubApi.post('/gists', gistData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Update an Existing Gist by ID
export const updateGist = async (gistId, gistData) => {
  try {
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    return response.data;
  } catch (error) {
   handleApiError(error);
 }
};

// Delete a Gist by ID
export const deleteGist = async (gistId) => {
   try { 
     await githubApi.delete(`/gists/${gistId}`);
   } catch (error) { 
     handleApiError(error); 
   }
};