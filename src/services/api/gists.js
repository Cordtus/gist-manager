// services/api/gists.js

import { handleApiError } from '../../utils/errorHandler.js'
import { githubApi } from './github';

/**
 * Fetch all gists for the authenticated user
 * 
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Array>} - Array of gists
 */
export const getGists = async (setError) => {
  try {
    const response = await githubApi.get('/gists');
    return response.data;
  } catch (error) {
    handleApiError(error, setError);
    throw error; // Re-throw to allow component-level handling
  }
};

/**
 * Fetch a single gist by ID
 * 
 * @param {string} id - The ID of the gist to fetch
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Object>} - The gist data
 */
export const getGist = async (id, setError) => {
  try {
    const response = await githubApi.get(`/gists/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Create a new gist
 * 
 * @param {Object} gistData - The gist data to be created
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Object>} - The created gist
 */
export const createGist = async (gistData, setError) => {
  try {
    const response = await githubApi.post('/gists', gistData);
    return response.data;
  } catch (error) {
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Update an existing gist
 * 
 * @param {string} gistId - The ID of the gist to update
 * @param {Object} gistData - The updated gist data
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Object>} - The updated gist
 */
export const updateGist = async (gistId, gistData, setError) => {
  try {
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    return response.data;
  } catch (error) {
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Delete a gist
 * 
 * @param {string} gistId - The ID of the gist to delete
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<void>}
 */
export const deleteGist = async (gistId, setError) => {
  try { 
    await githubApi.delete(`/gists/${gistId}`);
    return true; // Return success status
  } catch (error) { 
    handleApiError(error, setError);
    throw error;
  }
};