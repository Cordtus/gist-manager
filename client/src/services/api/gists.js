/**
 * Gist API Service
 * Primary service for GitHub Gist CRUD operations with client-side caching.
 * Implements per-user cache isolation and security best practices.
 * @module services/api/gists
 */

import { handleApiError, logError, logInfo } from '../../utils/logger';
import { githubApi } from './github';

/**
 * In-memory cache structure with user/page isolation.
 * Tokens authenticate requests but are never used as cache keys.
 */
const cacheByUser = new Map();
const GITHUB_ACCEPT_HEADER = 'application/vnd.github+json';

const hasValue = (value) => value !== null && value !== undefined && value !== '';

const getPageCacheKey = (page, perPage) => `${page}:${perPage}`;

const getResponseHeader = (headers, name) => headers?.get?.(name) ?? null;

const getNextPage = (linkHeader) => {
	if (!linkHeader) return null;

	const nextLink = linkHeader
		.split(',')
		.find((link) => /\brel\s*=\s*(?:"[^"]*\bnext\b[^"]*"|next)/i.test(link));
	const url = nextLink?.match(/<([^>]+)>/)?.[1];

	if (!url) return null;

	try {
		const nextPage = Number.parseInt(new URL(url).searchParams.get('page'), 10);
		return Number.isInteger(nextPage) && nextPage > 0 ? nextPage : null;
	} catch {
		return null;
	}
};

const validatePageOptions = (token, userId, page, perPage) => {
	if (!token) return new Error('Authentication required to fetch gists');
	if (!hasValue(userId)) return new Error('User ID required to fetch gists');
	if (!Number.isInteger(page) || page < 1) return new Error('Page must be a positive integer');
	if (!Number.isInteger(perPage) || perPage < 1)
		return new Error('perPage must be a positive integer');
	return null;
};

const getUserPages = (userId) => {
	let pages = cacheByUser.get(userId);
	if (!pages) {
		pages = new Map();
		cacheByUser.set(userId, pages);
	}
	return pages;
};

/**
 * Invalidate every cached page for one user after that user's gist mutation.
 */
export const invalidateUserGistsCache = (userId) => {
	if (!hasValue(userId)) return;
	cacheByUser.delete(userId);
	logInfo('User gist cache invalidated', { userId });
};

/**
 * Clear all user caches, for logout and token-invalid events.
 */
export const clearGistsCache = () => {
	cacheByUser.clear();
	logInfo('All gist caches cleared');
};

// Listen for logout events to clear cache
if (typeof window !== 'undefined') {
	window.addEventListener('auth:logout', clearGistsCache);
	window.addEventListener('auth:token_invalid', clearGistsCache);
}

/**
 * Fetch one page of the authenticated user's gists.
 *
 * @param {Object} options - Page request options
 * @param {string} options.token - GitHub access token
 * @param {string|number} options.userId - Required cache identity
 * @param {number} [options.page=1] - One-indexed page number
 * @param {number} [options.perPage=20] - Number of gists per page
 * @param {boolean} [options.force=false] - Revalidate a cached page
 * @param {AbortSignal} [options.signal] - Request cancellation signal
 * @returns {Promise<{gists: Array, page: number, perPage: number, hasNextPage: boolean, nextPage: number|null, eTag: string|null}>}
 */
export const getGistPage = ({
	token,
	userId,
	page = 1,
	perPage = 20,
	force = false,
	signal,
} = {}) => {
	const validationError = validatePageOptions(token, userId, page, perPage);
	if (validationError) return Promise.reject(validationError);

	const pages = getUserPages(userId);
	const cacheKey = getPageCacheKey(page, perPage);
	const entry = pages.get(cacheKey) || { page, perPage, value: null, eTag: null, pending: null };
	pages.set(cacheKey, entry);

	if (entry.pending) return entry.pending;

	const fetchPage = () => {
		if (!force && entry.value) return Promise.resolve(entry.value);

		const headers = {
			Accept: GITHUB_ACCEPT_HEADER,
			Authorization: `Bearer ${token}`,
		};
		if (force && entry.eTag) headers['If-None-Match'] = entry.eTag;

		logInfo('Fetching gist page', { page, perPage, userId });

		let responsePromise;
		try {
			responsePromise = githubApi.get('/gists', {
				headers,
				params: { per_page: perPage, page },
				signal,
				validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
			});
		} catch (error) {
			return Promise.reject(error);
		}

		return Promise.resolve(responsePromise)
			.then((response) => {
				if (response.status === 304) {
					if (!entry.value) throw new Error('Received 304 without a cached gist page');
					return entry.value;
				}

				const nextPage = getNextPage(getResponseHeader(response.headers, 'link'));
				const value = {
					gists: Array.isArray(response.data) ? response.data : [],
					page,
					perPage,
					hasNextPage: nextPage !== null,
					nextPage,
					eTag: getResponseHeader(response.headers, 'etag'),
				};

				entry.eTag = value.eTag;
				entry.value = value;
				return value;
			})
			.catch((error) => {
				logError('Error fetching gist page', { error: error.message, page, userId });
				throw error;
			});
	};

	const request = fetchPage().finally(() => {
		entry.pending = null;
	});
	entry.pending = request;
	return request;
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
 * Fetch a public gist by ID (no authentication required)
 * Used for shareable links - only works for public gists
 *
 * @param {string} id - Gist ID
 * @param {Function} [setError] - Error handler
 * @returns {Promise<Object>}
 */
export const getPublicGist = async (id, setError) => {
	try {
		logInfo(`Fetching public gist with ID: ${id}`);
		const response = await githubApi.get(`/gists/${id}`);
		logInfo(`Successfully fetched public gist: ${id}`);
		return response.data;
	} catch (error) {
		if (error.response?.status === 404) {
			logInfo(`Gist not found or is private: ${id}`);
			if (setError) setError('Gist not found or is private');
		} else {
			logError(`Error fetching public gist: ${id}`, { error: error.message });
			handleApiError(error, setError);
		}
		throw error;
	}
};

/**
 * Fork a gist to the authenticated user's account
 * SECURITY: Requires authentication
 *
 * @param {string} gistId - Gist ID to fork
 * @param {string} token - GitHub access token
 * @param {Function} [setError] - Error handler
 * @param {string} [userId] - User ID for cache invalidation
 * @returns {Promise<Object>} - The forked gist
 */
export const forkGist = async (gistId, token, setError, userId = null) => {
	if (!token) {
		const error = new Error('Authentication required');
		if (setError) setError('Authentication required');
		throw error;
	}

	try {
		logInfo(`Forking gist: ${gistId}`);
		const headers = { Authorization: `Bearer ${token}` };
		const response = await githubApi.post(`/gists/${gistId}/forks`, {}, { headers });
		logInfo(`Successfully forked gist: ${gistId} -> ${response.data.id}`);

		// Invalidate user-specific cache since they now have a new gist
		invalidateUserGistsCache(userId);

		return response.data;
	} catch (error) {
		logError(`Error forking gist: ${gistId}`, { error: error.message });
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
		invalidateUserGistsCache(userId);

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
		invalidateUserGistsCache(userId);

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
		invalidateUserGistsCache(userId);

		return true;
	} catch (error) {
		logError(`Error deleting gist: ${gistId}`, { error: error.message });
		handleApiError(error, setError);
		throw error;
	}
};
