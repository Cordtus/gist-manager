// services/api/sharedGists.js

import { api } from './github';
import { logInfo, logError } from '../../utils/logger';

/**
 * Get all shared gists
 * 
 * @returns {Promise<Array>} - Array of shared gists
 */
export const getAllSharedGists = async () => {
  try {
    logInfo('Fetching all shared gists');
    const response = await api.get('/api/shared-gists');
    
    return response.data;
  } catch (error) {
    logError('Error fetching shared gists', { error: error.message });
    throw error;
  }
};

/**
 * Share a gist
 * 
 * @param {string} gistId - The ID of the gist to share
 * @param {Object} gistData - The gist data to be shared
 * @returns {Promise<Object>} - Response data
 */
export const shareGist = async (gistId, gistData) => {
  try {
    logInfo(`Sharing gist: ${gistId}`);
    
    const response = await api.post('/api/shared-gists', {
      gistId,
      gistData
    });
    
    logInfo(`Successfully shared gist: ${gistId}`);
    return response.data;
  } catch (error) {
    logError(`Error sharing gist: ${gistId}`, { error: error.message });
    throw error;
  }
};

/**
 * Unshare a gist
 * 
 * @param {string} gistId - The ID of the gist to unshare
 * @returns {Promise<Object>} - Response data
 */
export const unshareGist = async (gistId) => {
  try {
    logInfo(`Unsharing gist: ${gistId}`);
    
    const response = await api.delete(`/api/shared-gists/${gistId}`);
    
    logInfo(`Successfully unshared gist: ${gistId}`);
    return response.data;
  } catch (error) {
    logError(`Error unsharing gist: ${gistId}`, { error: error.message });
    throw error;
  }
};

/**
 * Check if a gist is shared
 * 
 * @param {string} gistId - The ID of the gist to check
 * @returns {Promise<boolean>} - Whether the gist is shared
 */
export const isGistShared = async (gistId) => {
  try {
    logInfo(`Checking if gist is shared: ${gistId}`);
    
    const response = await api.get(`/api/shared-gists/check/${gistId}`);
    
    return response.data.isShared;
  } catch (error) {
    logError(`Error checking if gist is shared: ${gistId}`, { error: error.message });
    throw error;
  }
};

/**
 * Get user's shared gists
 * 
 * @returns {Promise<Array>} - Array of user's shared gists
 */
export const getUserSharedGists = async () => {
  try {
    logInfo('Fetching user shared gists');
    
    const response = await api.get('/api/shared-gists/user');
    
    return response.data.gists;
  } catch (error) {
    logError('Error fetching user shared gists', { error: error.message });
    throw error;
  }
};

// Export all functions
const sharedGistsService = {
  getAllSharedGists,
  shareGist,
  unshareGist,
  isGistShared,
  getUserSharedGists
};

export default sharedGistsService;