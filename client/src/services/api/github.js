/**
 * GitHub API Service
 * Provides axios instances and core utilities for GitHub API interactions.
 * For gist-specific operations with caching, use gists.js instead.
 * @module services/api/github
 */

import axios from 'axios';
import { logInfo, logError, logWarning } from '../../utils/logger';
import { API_BASE_URL, GITHUB_API } from '../../config/api';

/**
 * Axios instance for backend API requests
 * Includes credentials for cross-origin cookie handling
 * @type {import('axios').AxiosInstance}
 */
export const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
});

/**
 * Axios instance for direct GitHub API requests
 * Configured with GitHub API base URL and accept headers
 * @type {import('axios').AxiosInstance}
 */
export const githubApi = axios.create(GITHUB_API);

// Response interceptor for rate limit monitoring and auth error handling
githubApi.interceptors.response.use(
	(response) => {
		if (process.env.NODE_ENV !== 'production') {
			const rateLimit = {
				limit: response.headers['x-ratelimit-limit'],
				remaining: response.headers['x-ratelimit-remaining'],
				reset: response.headers['x-ratelimit-reset']
					? new Date(response.headers['x-ratelimit-reset'] * 1000).toISOString()
					: 'unknown'
			};

			if (rateLimit.limit && rateLimit.remaining &&
				(parseInt(rateLimit.remaining) / parseInt(rateLimit.limit)) < 0.1) {
				logWarning('GitHub API rate limit running low', rateLimit);
			}
		}

		return response;
	},
	(error) => {
		if (error.response?.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
			const resetTime = error.response.headers['x-ratelimit-reset']
				? new Date(error.response.headers['x-ratelimit-reset'] * 1000)
				: new Date(Date.now() + 60000);

			logWarning('GitHub API rate limit exceeded', {
				resetTime: resetTime.toISOString(),
				retryAfter: Math.ceil((resetTime - new Date()) / 1000) + ' seconds'
			});
		}

		if (error.response?.status === 401) {
			logError('Unauthorized GitHub API request - token may be invalid');

			localStorage.removeItem('github_token');
			localStorage.removeItem('gist_manager_session');

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('auth:token_invalid'));
			}
		}

		return Promise.reject(error);
	}
);

// Request interceptor to add authorization header
githubApi.interceptors.request.use((config) => {
	let token = null;

	try {
		const sessionData = localStorage.getItem('gist_manager_session');
		if (sessionData) {
			const { token: sessionToken, expiration } = JSON.parse(sessionData);
			if (expiration && new Date().getTime() < expiration) {
				token = sessionToken;
			}
		}
	} catch (error) {
		logError('Error retrieving token from session data', { error: error.message });
	}

	if (!token) {
		token = localStorage.getItem('github_token');
	}

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
}, (error) => {
	return Promise.reject(error);
});

/**
 * Set authorization token for both API instances
 * @param {string|null} token - GitHub access token or null to clear
 */
export const setAuthToken = (token) => {
	if (token) {
		api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
		githubApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
		logInfo('Auth token set for API requests');
	} else {
		delete api.defaults.headers.common['Authorization'];
		delete githubApi.defaults.headers.common['Authorization'];
		logInfo('Auth token cleared from API requests');
	}
};

/**
 * Get gists for a specific user (not the authenticated user)
 * Use this for viewing other users' public gists
 * @param {string} username - GitHub username
 * @param {Object} [options] - Query options
 * @param {number} [options.per_page=100] - Results per page
 * @returns {Promise<Array>} Array of gist objects
 */
export const getUserGists = async (username, options = {}) => {
	try {
		logInfo('Fetching gists for user', { username });
		const params = {
			per_page: options.per_page || 100,
			...options
		};

		const response = await githubApi.get(`/users/${username}/gists`, { params });
		logInfo('Successfully fetched user gists', { count: response.data.length });
		return response.data;
	} catch (error) {
		logError('Error fetching user gists', { username, error: error.message });
		throw error;
	}
};

/**
 * Fork a gist to the authenticated user's account
 * @param {string} gistId - ID of the gist to fork
 * @returns {Promise<Object>} The forked gist object
 */
export const forkGist = async (gistId) => {
	try {
		logInfo('Forking gist', { gistId });
		const response = await githubApi.post(`/gists/${gistId}/forks`);
		logInfo('Successfully forked gist', { newGistId: response.data.id });
		return response.data;
	} catch (error) {
		logError('Error forking gist', { gistId, error: error.message });
		throw error;
	}
};

const githubService = {
	api,
	githubApi,
	setAuthToken,
	getUserGists,
	forkGist
};

export default githubService;
