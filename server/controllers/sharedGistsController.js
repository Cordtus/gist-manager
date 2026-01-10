/**
 * Shared Gists Controller
 * Manages community gist sharing functionality.
 * Stores shared gist metadata in local JSON file storage.
 * @module controllers/sharedGistsController
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/** @type {string} Directory path for shared gists storage */
const SHARED_GISTS_DIR = path.join(__dirname, '..', 'data', 'shared-gists');

/** @type {string} Path to the shared gists index file */
const SHARED_GISTS_INDEX = path.join(SHARED_GISTS_DIR, 'index.json');

/**
 * Initialize shared gists directory and index file
 * Creates the storage directory and empty index if they don't exist
 * @returns {Promise<void>}
 */
const initSharedGists = async () => {
	try {
		await fs.mkdir(SHARED_GISTS_DIR, { recursive: true });

		try {
			await fs.access(SHARED_GISTS_INDEX);
		} catch {
			await fs.writeFile(SHARED_GISTS_INDEX, JSON.stringify({
				gists: [],
				lastUpdated: new Date().toISOString()
			}, null, 2));
			logger.info('Initialized shared gists index file');
		}
	} catch (error) {
		logger.error('Error initializing shared gists directory', { error: error.message });
		throw error;
	}
};

// Initialize on module load
initSharedGists().catch(err => {
	logger.error('Failed to initialize shared gists storage', { error: err.message });
});

/**
 * Read the shared gists index file
 * @returns {Promise<{gists: Array, lastUpdated: string}>} The index data
 */
const getIndex = async () => {
	try {
		const data = await fs.readFile(SHARED_GISTS_INDEX, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		logger.error('Error reading shared gists index', { error: error.message });
		return { gists: [], lastUpdated: new Date().toISOString() };
	}
};

/**
 * Write to the shared gists index file
 * Automatically updates the lastUpdated timestamp
 * @param {Object} index - The index object to write
 * @param {Array} index.gists - Array of shared gist objects
 * @returns {Promise<void>}
 */
const updateIndex = async (index) => {
	try {
		index.lastUpdated = new Date().toISOString();
		await fs.writeFile(SHARED_GISTS_INDEX, JSON.stringify(index, null, 2));
	} catch (error) {
		logger.error('Error updating shared gists index', { error: error.message });
		throw error;
	}
};

/**
 * Get all shared gists
 * Returns the complete index of community-shared gists
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
exports.getAllSharedGists = async (req, res) => {
	try {
		const index = await getIndex();
		res.json(index);
	} catch (error) {
		logger.error('Error fetching shared gists', { error: error.message });
		res.status(500).json({ error: 'Failed to fetch shared gists' });
	}
};

/**
 * Share a gist with the community
 * Only public gists can be shared. Updates existing shared gist if already shared.
 * @param {import('express').Request} req - Express request with gistId and gistData in body
 * @param {import('express').Response} res - Express response
 */
exports.shareGist = async (req, res) => {
	try {
		const { gistId, gistData } = req.body;
		const userId = req.session.user?.id;
		const username = req.session.user?.login;

		if (!userId || !username) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		if (!gistId || !gistData) {
			return res.status(400).json({ error: 'Missing gist ID or data' });
		}

		if (!gistData.public) {
			return res.status(400).json({ error: 'Only public gists can be shared' });
		}

		const index = await getIndex();
		const existingGistIndex = index.gists.findIndex(g => g.id === gistId);

		if (existingGistIndex >= 0) {
			index.gists[existingGistIndex] = {
				...index.gists[existingGistIndex],
				...gistData,
				updatedAt: new Date().toISOString(),
				userId,
				username
			};

			logger.info('Updated shared gist', { gistId, username });
		} else {
			const sharedGist = {
				...gistData,
				id: gistId,
				sharedId: crypto.randomUUID(),
				sharedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				userId,
				username
			};

			index.gists.push(sharedGist);
			logger.info('New gist shared', { gistId, username });
		}

		await updateIndex(index);
		res.json({ success: true, message: 'Gist shared successfully' });
	} catch (error) {
		logger.error('Error sharing gist', { error: error.message });
		res.status(500).json({ error: 'Failed to share gist' });
	}
};

/**
 * Remove a gist from community sharing
 * Users can only unshare their own gists
 * @param {import('express').Request} req - Express request with gistId in params
 * @param {import('express').Response} res - Express response
 */
exports.unshareGist = async (req, res) => {
	try {
		const { gistId } = req.params;
		const userId = req.session.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const index = await getIndex();
		const gistIndex = index.gists.findIndex(g => g.id === gistId);

		if (gistIndex === -1) {
			return res.status(404).json({ error: 'Shared gist not found' });
		}

		if (index.gists[gistIndex].userId !== userId) {
			return res.status(403).json({ error: 'You can only unshare your own gists' });
		}

		index.gists.splice(gistIndex, 1);
		await updateIndex(index);

		logger.info('Gist unshared', { gistId, username: req.session.user.login });
		res.json({ success: true, message: 'Gist unshared successfully' });
	} catch (error) {
		logger.error('Error unsharing gist', { error: error.message });
		res.status(500).json({ error: 'Failed to unshare gist' });
	}
};

/**
 * Check if a gist is currently shared with the community
 * @param {import('express').Request} req - Express request with gistId in params
 * @param {import('express').Response} res - Express response
 */
exports.isGistShared = async (req, res) => {
	try {
		const { gistId } = req.params;
		const index = await getIndex();
		const isShared = index.gists.some(g => g.id === gistId);
		res.json({ isShared });
	} catch (error) {
		logger.error('Error checking if gist is shared', { error: error.message });
		res.status(500).json({ error: 'Failed to check if gist is shared' });
	}
};

/**
 * Get all gists shared by the authenticated user
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
exports.getUserSharedGists = async (req, res) => {
	try {
		const userId = req.session.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'User not authenticated' });
		}

		const index = await getIndex();
		const userGists = index.gists.filter(g => g.userId === userId);
		res.json({ gists: userGists });
	} catch (error) {
		logger.error('Error fetching user shared gists', { error: error.message });
		res.status(500).json({ error: 'Failed to fetch user shared gists' });
	}
};
