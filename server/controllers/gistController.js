/**
 * Gist Controller
 * Handles CRUD operations for GitHub Gists via the GitHub API.
 * Implements server-side caching with user isolation for performance.
 * @module controllers/gistController
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const logger = require('../utils/logger');

/** @type {NodeCache} Server-side cache with 5 minute TTL */
const cache = new NodeCache({ stdTTL: 300 });

/**
 * GitHub API client instance
 * @type {import('axios').AxiosInstance}
 */
const githubApi = axios.create({
	baseURL: 'https://api.github.com',
	headers: {
		Accept: 'application/vnd.github.v3+json',
	},
});

/**
 * Generate secure cache key from token and user ID
 * Uses SHA256 hash to prevent token exposure in memory
 * @param {string} token - GitHub access token
 * @param {string} [userId=''] - GitHub user ID for additional isolation
 * @returns {string} Hashed cache key
 */
const hashToken = (token, userId = '') => {
	const data = userId ? `${token}_${userId}` : token;
	return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Create authorization header config for GitHub API requests
 * @param {string} token - GitHub access token
 * @returns {Object} Axios request config with Authorization header
 */
const getAuthConfig = (token) => ({
	headers: {
		Authorization: `Bearer ${token}`,
	},
});

/**
 * Invalidate cache for a specific user
 * @param {string} token - GitHub access token
 * @param {string} [userId=''] - GitHub user ID
 */
const invalidateCache = (token, userId = '') => {
	const tokenHash = hashToken(token, userId);
	cache.del(`gists-${tokenHash}`);
};

/**
 * Get a single gist by ID
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
exports.getGist = async (req, res) => {
	try {
		const { id } = req.params;
		const token = req.session.githubToken;

		const response = await githubApi.get(`/gists/${id}`, getAuthConfig(token));
		res.json(response.data);
	} catch (error) {
		logger.error('Error fetching gist', { gistId: req.params.id, error: error.message });

		if (error.response?.status === 401) {
			return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
		}
		if (error.response?.status === 404) {
			return res.status(404).json({ error: 'Gist not found' });
		}

		res.status(500).json({ error: 'Error fetching gist', details: error.message });
	}
};

/**
 * Get all gists for authenticated user with pagination
 * Results are cached per-user for 5 minutes
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
exports.getGists = async (req, res) => {
	try {
		const token = req.session.githubToken;
		const userId = req.session.user?.id || '';
		const tokenHash = hashToken(token, userId);
		const cacheKey = `gists-${tokenHash}`;

		const cachedGists = cache.get(cacheKey);
		if (cachedGists) {
			logger.info('Returning cached gists', { count: cachedGists.length });
			return res.json(cachedGists);
		}

		const allGists = [];
		let page = 1;
		const perPage = 100;

		while (true) {
			const response = await githubApi.get(
				`/gists?per_page=${perPage}&page=${page}`,
				getAuthConfig(token)
			);
			const gists = response.data;

			allGists.push(...gists);

			if (gists.length < perPage) break;
			page++;
		}

		cache.set(cacheKey, allGists);
		logger.info('Fetched and cached gists', { count: allGists.length });
		res.json(allGists);
	} catch (error) {
		logger.error('Error fetching gists', { error: error.message });

		if (error.response?.status === 401) {
			return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
		}

		res.status(500).json({ error: 'Error fetching gists', details: error.message });
	}
};

/**
 * Create a new gist
 * Invalidates user's gist cache on success
 * @param {import('express').Request} req - Express request with gist data in body
 * @param {import('express').Response} res - Express response
 */
exports.createGist = async (req, res) => {
	try {
		const token = req.session.githubToken;
		const userId = req.session.user?.id || '';

		const response = await githubApi.post('/gists', req.body, getAuthConfig(token));

		invalidateCache(token, userId);
		logger.info('Created gist', { gistId: response.data.id });
		res.json(response.data);
	} catch (error) {
		logger.error('Error creating gist', { error: error.message });

		if (error.response?.status === 401) {
			return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
		}
		if (error.response?.status === 422) {
			return res.status(422).json({ error: 'Invalid gist data', details: error.response.data });
		}

		res.status(500).json({ error: 'Error creating gist', details: error.message });
	}
};

/**
 * Update an existing gist
 * Invalidates user's gist cache on success
 * @param {import('express').Request} req - Express request with gist ID in params, update data in body
 * @param {import('express').Response} res - Express response
 */
exports.updateGist = async (req, res) => {
	try {
		const { id } = req.params;
		const token = req.session.githubToken;
		const userId = req.session.user?.id || '';

		const response = await githubApi.patch(`/gists/${id}`, req.body, getAuthConfig(token));

		invalidateCache(token, userId);
		logger.info('Updated gist', { gistId: id });
		res.json(response.data);
	} catch (error) {
		logger.error('Error updating gist', { gistId: req.params.id, error: error.message });

		if (error.response?.status === 401) {
			return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
		}
		if (error.response?.status === 404) {
			return res.status(404).json({ error: 'Gist not found' });
		}

		res.status(500).json({ error: 'Error updating gist', details: error.message });
	}
};

/**
 * Delete a gist
 * Invalidates user's gist cache on success
 * @param {import('express').Request} req - Express request with gist ID in params
 * @param {import('express').Response} res - Express response
 */
exports.deleteGist = async (req, res) => {
	try {
		const { id } = req.params;
		const token = req.session.githubToken;
		const userId = req.session.user?.id || '';

		await githubApi.delete(`/gists/${id}`, getAuthConfig(token));

		invalidateCache(token, userId);
		logger.info('Deleted gist', { gistId: id });
		res.status(204).send();
	} catch (error) {
		logger.error('Error deleting gist', { gistId: req.params.id, error: error.message });

		if (error.response?.status === 401) {
			return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
		}
		if (error.response?.status === 404) {
			return res.status(404).json({ error: 'Gist not found' });
		}

		res.status(500).json({ error: 'Error deleting gist', details: error.message });
	}
};
