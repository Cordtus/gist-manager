/**
 * GitHub API Service
 * Provides the axios instance for GitHub API interactions.
 * For gist-specific operations with caching, use gists.js instead.
 * @module services/api/github
 */

import axios from 'axios';
import { logError, logInfo } from '../../utils/logger';
import { clearSession, getStoredToken } from './session';

/**
 * Axios instance for direct GitHub API requests
 * @type {import('axios').AxiosInstance}
 */
export const githubApi = axios.create({
	baseURL: 'https://api.github.com',
	headers: {
		Accept: 'application/vnd.github.v3+json',
	},
});

// Clear the session and notify the app when GitHub rejects the token
githubApi.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			logError('Unauthorized GitHub API request - token may be invalid');
			clearSession();

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('auth:token_invalid'));
			}
		}

		return Promise.reject(error);
	},
);

// Request interceptor to add authorization header from the stored session
githubApi.interceptors.request.use((config) => {
	const token = getStoredToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

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
			...options,
		};

		const response = await githubApi.get(`/users/${username}/gists`, { params });
		logInfo('Successfully fetched user gists', { count: response.data.length });
		return response.data;
	} catch (error) {
		logError('Error fetching user gists', { username, error: error.message });
		throw error;
	}
};
