// services/api/gists.js

import { handleApiError, logInfo, logError } from '../../utils/logger';
import { githubApi } from './github';

/**
 * In-memory per-token cache structure
 */
const cacheByToken = new Map();
const FETCH_COOLDOWN = 5000;
const CACHE_TTL = 60000;

/**
 * Invalidate all cached gists (e.g., after create/update/delete)
 */
export const invalidateGistsCache = () => {
  cacheByToken.clear();
  logInfo('Gists cache invalidated');
};

/**
 * Fetch all gists for the authenticated user, with pagination
 * Utilizes per-token caching, cooldown, and concurrency guards
 *
 * @param {string} [token]
 * @param {Function} [setError]
 * @returns {Promise<Array>}
 */
export const getGists = async (token, setError) => {
  const key = token || 'default';
  const now = Date.now();
  let entry = cacheByToken.get(key);

  if (!entry) {
    entry = { data: null, ts: 0, fetching: false };
    cacheByToken.set(key, entry);
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
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

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

    // Cache result
    entry.data = allGists;
    entry.ts = Date.now();
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
 *
 * @param {string} id
 * @param {Function} [setError]
 * @returns {Promise<Object>}
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
 * Invalidates cache on success
 *
 * @param {Object} gistData
 * @param {Function} [setError]
 * @returns {Promise<Object>}
 */
export const createGist = async (gistData, setError) => {
  try {
    logInfo('Creating new gist', { description: gistData.description });
    const response = await githubApi.post('/gists', gistData);
    logInfo(`Successfully created gist: ${response.data.id}`);
    invalidateGistsCache();
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
 *
 * @param {string} gistId
 * @param {Object} gistData
 * @param {Function} [setError]
 * @returns {Promise<Object>}
 */
export const updateGist = async (gistId, gistData, setError) => {
  try {
    logInfo(`Updating gist: ${gistId}`);
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    logInfo(`Successfully updated gist: ${gistId}`);
    invalidateGistsCache();
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
 *
 * @param {string} gistId
 * @param {Function} [setError]
 * @returns {Promise<boolean>}
 */
export const deleteGist = async (gistId, setError) => {
  try {
    logInfo(`Deleting gist: ${gistId}`);
    await githubApi.delete(`/gists/${gistId}`);
    logInfo(`Successfully deleted gist: ${gistId}`);
    invalidateGistsCache();
    return true;
  } catch (error) {
    logError(`Error deleting gist: ${gistId}`, { error: error.message });
    handleApiError(error, setError);
    throw error;
  }
};

/**
 * Search through user's gists (client-side)
 * Depends on getGists(token, setError)
 *
 * @param {string} query - The search query
 * @param {string} [token] - Optional token context
 * @param {Function} [setError] - Optional state setter for error handling
 * @returns {Promise<Array>}
 */
export const searchGists = async (query, token, setError) => {
  try {
    logInfo(`Searching gists with query: ${query}`);
    const allGists = await getGists(token, setError);
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
 *
 * @param {string} gistId
 * @param {Function} [setError]
 * @returns {Promise<boolean>}
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
 * @param {string} gistId
 * @param {Function} [setError]
 * @returns {Promise<boolean>}
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
 * @param {string} gistId
 * @param {Function} [setError]
 * @returns {Promise<boolean>}
 */
export const isGistStarred = async (gistId, setError) => {
  try {
    logInfo(`Checking if gist is starred: ${gistId}`);
    await githubApi.get(`/gists/${gistId}/star`);
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
