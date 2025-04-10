// services/api/gists.js

import { handleApiError, logInfo, logError, trackError, ErrorCategory } from '../../utils/logger';
import { githubApi } from './github';

/**
 * Fetch all gists for the authenticated user
 * 
 * @param {string} [token] - Optional token, useful for testing or specific user context
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Array>} - Array of gists
 */
export const getGists = async (token, setError) => {
  try {
    logInfo('Fetching gists for authenticated user');
    const response = await githubApi.get('/gists');
    logInfo(`Successfully fetched ${response.data.length} gists`);
    return response.data;
  } catch (error) {
    logError('Error fetching gists', { error: error.message });
    trackError(error, ErrorCategory.API, { action: 'getGists' });
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
    logInfo(`Fetching gist with ID: ${id}`);
    const response = await githubApi.get(`/gists/${id}`);
    logInfo(`Successfully fetched gist: ${id}`);
    return response.data;
  } catch (error) {
    logError(`Error fetching gist: ${id}`, { error: error.message });
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
    logInfo('Creating new gist', { description: gistData.description });
    const response = await githubApi.post('/gists', gistData);
    logInfo(`Successfully created gist: ${response.data.id}`);
    return response.data;
  } catch (error) {
    logError('Error creating gist', { error: error.message });
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
    logInfo(`Updating gist: ${gistId}`);
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    logInfo(`Successfully updated gist: ${gistId}`);
    return response.data;
  } catch (error) {
    logError(`Error updating gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Delete a gist
 * 
 * @param {string} gistId - The ID of the gist to delete
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<boolean>} - Success status
 */
export const deleteGist = async (gistId, setError) => {
  try { 
    logInfo(`Deleting gist: ${gistId}`);
    await githubApi.delete(`/gists/${gistId}`);
    logInfo(`Successfully deleted gist: ${gistId}`);
    return true; // Return success status
  } catch (error) { 
    logError(`Error deleting gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Search through user's gists
 * 
 * @param {string} query - The search query
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Array>} - Array of matching gists
 */
export const searchGists = async (query, setError) => {
  try {
    logInfo(`Searching gists with query: ${query}`);
    // First get all gists
    const allGists = await getGists();
    
    // Client-side filtering (GitHub API doesn't support direct gist content search)
    const normalizedQuery = query.toLowerCase();
    const results = allGists.filter(gist => {
      // Search in description
      if (gist.description && gist.description.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Search in filenames
      if (Object.keys(gist.files).some(filename => 
        filename.toLowerCase().includes(normalizedQuery))) {
        return true;
      }
      
      // Search in file content (for truncated files, this will be partial)
      return Object.values(gist.files).some(file => 
        file.content && file.content.toLowerCase().includes(normalizedQuery));
    });
    
    logInfo(`Search returned ${results.length} results`);
    return results;
  } catch (error) {
    logError('Error searching gists', { error: error.message, query });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Star a gist
 * 
 * @param {string} gistId - The ID of the gist to star
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<boolean>} - Success status
 */
export const starGist = async (gistId, setError) => {
  try {
    logInfo(`Starring gist: ${gistId}`);
    await githubApi.put(`/gists/${gistId}/star`);
    logInfo(`Successfully starred gist: ${gistId}`);
    return true;
  } catch (error) {
    logError(`Error starring gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Unstar a gist
 * 
 * @param {string} gistId - The ID of the gist to unstar
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<boolean>} - Success status
 */
export const unstarGist = async (gistId, setError) => {
  try {
    logInfo(`Unstarring gist: ${gistId}`);
    await githubApi.delete(`/gists/${gistId}/star`);
    logInfo(`Successfully unstarred gist: ${gistId}`);
    return true;
  } catch (error) {
    logError(`Error unstarring gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Check if a gist is starred
 * 
 * @param {string} gistId - The ID of the gist to check
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<boolean>} - Whether the gist is starred
 */
export const isGistStarred = async (gistId, setError) => {
  try {
    logInfo(`Checking if gist is starred: ${gistId}`);
    await githubApi.get(`/gists/${gistId}/star`);
    logInfo(`Gist is starred: ${gistId}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logInfo(`Gist is not starred: ${gistId}`);
      return false;
    }
    logError(`Error checking if gist is starred: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};