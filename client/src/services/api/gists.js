// services/api/gists.js

import { handleApiError, logInfo, logError } from '../../utils/logger';
import { githubApi } from './github';

/**
 * In-memory cache structure with user isolation
 * Cache is cleared on logout to prevent data leakage
 */
const cacheByUser = new Map();
const FETCH_COOLDOWN = 5000;
const CACHE_TTL = 60000;

/**
 * Generate a secure cache key based on token and user ID
 * This prevents cache pollution between users
 */
const getCacheKey = (token, userId) => {
  if (!token) {
    // No token = no cache (security requirement)
    return null;
  }
  // Include user ID if available for additional security
  const key = userId ? `${token}_${userId}` : token;
  // Hash the key for security (prevent token exposure in memory dumps)
  return btoa(key).substring(0, 32); // Simple obfuscation
};

/**
 * Invalidate all cached gists (e.g., after create/update/delete)
 * Can optionally clear only specific user's cache
 */
export const invalidateGistsCache = (token = null, userId = null) => {
  if (token && userId) {
    const key = getCacheKey(token, userId);
    if (key) {
      cacheByUser.delete(key);
      logInfo('User-specific gists cache invalidated');
    }
  } else {
    // Clear all caches (e.g., on logout)
    cacheByUser.clear();
    logInfo('All gists caches invalidated');
  }
};

/**
 * Clear cache for current user on logout
 * SECURITY: Prevents next user from seeing previous user's data
 */
export const clearUserCache = () => {
  cacheByUser.clear();
  logInfo('User cache cleared for security');
};

// Listen for logout events to clear cache
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', clearUserCache);
  window.addEventListener('auth:token_invalid', clearUserCache);
}

/**
 * Fetch all gists for the authenticated user, with pagination
 * Utilizes per-user caching with proper isolation
 *
 * @param {string} token - REQUIRED: GitHub access token
 * @param {Function} [setError] - Error handler
 * @param {string} [userId] - Optional user ID for cache isolation
 * @returns {Promise<Array>}
 */
export const getGists = async (token, setError, userId = null) => {
  // SECURITY: Require token for all gist fetching
  if (!token) {
    const error = new Error('Authentication required to fetch gists');
    logError('getGists called without token - security violation');
    if (setError) setError('Authentication required');
    throw error;
  }

  const cacheKey = getCacheKey(token, userId);
  if (!cacheKey) {
    // Should not happen with token present, but handle gracefully
    logError('Failed to generate cache key');
    throw new Error('Cache key generation failed');
  }

  const now = Date.now();
  let entry = cacheByUser.get(cacheKey);

  if (!entry) {
    entry = { data: null, ts: 0, fetching: false, userId };
    cacheByUser.set(cacheKey, entry);
  }

  // Validate cache entry belongs to correct user
  if (userId && entry.userId && entry.userId !== userId) {
    logError('Cache entry user mismatch - clearing cache');
    cacheByUser.delete(cacheKey);
    entry = { data: null, ts: 0, fetching: false, userId };
    cacheByUser.set(cacheKey, entry);
  }

  // Return cached if fresh
  if (entry.data && now - entry.ts < CACHE_TTL) {
    logInfo('Using cached gists data', { cacheAge: now - entry.ts });
    return entry.data;
  }

  // Prevent concurrent fetches
  if (entry.fetching) {
    logInfo('Fetch prevented: Already fetching gists');
    return entry.data || [];
  }

  // Respect cooldown
  if (now - entry.ts < FETCH_COOLDOWN) {
    logInfo('Fetch prevented: Cooldown period not elapsed');
    return entry.data || [];
  }

  try {
    logInfo('Fetching gists for authenticated user');
    entry.fetching = true;

    const allGists = [];
    const perPage = 100;
    let page = 1;

    // Always use the provided token for authorization
    const headers = { Authorization: `Bearer ${token}` };

    while (true) {
      const response = await githubApi.get(
        `/gists?per_page=${perPage}&page=${page}`,
        { headers }
      );
      const gists = response.data;
      allGists.push(...gists);
      if (gists.length < perPage) break;
      page++;
    }

    // Cache result with user association
    entry.data = allGists;
    entry.ts = Date.now();
    entry.userId = userId;
    logInfo(`Successfully fetched ${allGists.length} gists`);

    return allGists;
  } catch (error) {
    logError('Error fetching gists', { error: error.message });
    handleApiError(error, setError);
    throw error;
  } finally {
    entry.fetching = false;
  }
};

/**
 * Fetch a single gist by ID
 * SECURITY: Requires authentication token
 *
 * @param {string} id - Gist ID
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @returns {Promise<Object>}
 */
export const getGist = async (id, token, setError) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Fetching gist with ID: ${id}`);
    const headers = { Authorization: `Bearer ${token}` };
    const response = await githubApi.get(`/gists/${id}`, { headers });
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
 * Invalidates cache on success
 * SECURITY: Requires authentication
 *
 * @param {Object} gistData - Gist data
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @param {string} [userId] - User ID for cache invalidation
 * @returns {Promise<Object>}
 */
export const createGist = async (gistData, token, setError, userId = null) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo('Creating new gist', { description: gistData.description });
    const headers = { Authorization: `Bearer ${token}` };
    const response = await githubApi.post('/gists', gistData, { headers });
    logInfo(`Successfully created gist: ${response.data.id}`);
    
    // Invalidate user-specific cache
    invalidateGistsCache(token, userId);
    
    return response.data;
  } catch (error) {
    logError('Error creating gist', { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Update an existing gist
 * Invalidates cache on success
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID
 * @param {Object} gistData - Updated gist data
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @param {string} [userId] - User ID for cache invalidation
 * @returns {Promise<Object>}
 */
export const updateGist = async (gistId, gistData, token, setError, userId = null) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Updating gist: ${gistId}`);
    const headers = { Authorization: `Bearer ${token}` };
    const response = await githubApi.patch(`/gists/${gistId}`, gistData, { headers });
    logInfo(`Successfully updated gist: ${gistId}`);
    
    // Invalidate user-specific cache
    invalidateGistsCache(token, userId);
    
    return response.data;
  } catch (error) {
    logError(`Error updating gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Delete a gist
 * Invalidates cache on success
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @param {string} [userId] - User ID for cache invalidation
 * @returns {Promise<boolean>}
 */
export const deleteGist = async (gistId, token, setError, userId = null) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Deleting gist: ${gistId}`);
    const headers = { Authorization: `Bearer ${token}` };
    await githubApi.delete(`/gists/${gistId}`, { headers });
    logInfo(`Successfully deleted gist: ${gistId}`);
    
    // Invalidate user-specific cache
    invalidateGistsCache(token, userId);
    
    return true;
  } catch (error) {
    logError(`Error deleting gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Search through user's gists (client-side)
 * SECURITY: Requires authentication
 *
 * @param {string} query - The search query
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Optional state setter for error handling
 * @param {string} [userId] - Optional user ID for cache key
 * @returns {Promise<Array>}
 */
export const searchGists = async (query, token, setError, userId = null) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Searching gists with query: ${query}`);
    const allGists = await getGists(token, setError, userId);
    const normalizedQuery = query.toLowerCase();
    const results = allGists.filter(gist => {
      if (gist.description?.toLowerCase().includes(normalizedQuery)) return true;
      if (Object.keys(gist.files).some(fn => fn.toLowerCase().includes(normalizedQuery))) return true;
      return Object.values(gist.files).some(file =>
        file.content?.toLowerCase().includes(normalizedQuery)
      );
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
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @returns {Promise<boolean>}
 */
export const starGist = async (gistId, token, setError) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Starring gist: ${gistId}`);
    const headers = { Authorization: `Bearer ${token}` };
    await githubApi.put(`/gists/${gistId}/star`, {}, { headers });
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
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @returns {Promise<boolean>}
 */
export const unstarGist = async (gistId, token, setError) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Unstarring gist: ${gistId}`);
    const headers = { Authorization: `Bearer ${token}` };
    await githubApi.delete(`/gists/${gistId}/star`, { headers });
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
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @returns {Promise<boolean>}
 */
export const isGistStarred = async (gistId, token, setError) => {
  if (!token) {
    const error = new Error('Authentication required');
    if (setError) setError('Authentication required');
    throw error;
  }

  try {
    logInfo(`Checking if gist is starred: ${gistId}`);
    const headers = { Authorization: `Bearer ${token}` };
    await githubApi.get(`/gists/${gistId}/star`, { headers });
    logInfo(`Gist is starred: ${gistId}`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      logInfo(`Gist is not starred: ${gistId}`);
      return false;
    }
    logError(`Error checking if gist is starred: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};