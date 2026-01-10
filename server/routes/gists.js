/**
 * Gist Routes
 * API endpoints for GitHub Gist CRUD operations.
 * All routes require authentication via session token.
 * @module routes/gists
 */

const express = require('express');
const gistController = require('../controllers/gistController.js');

const router = express.Router();

/**
 * Authentication middleware
 * Verifies user has valid GitHub token in session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticated = (req, res, next) => {
	if (!req.session.githubToken) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	next();
};

// Apply auth middleware to all routes
router.use(isAuthenticated);

router.get('/', gistController.getGists);
router.post('/', gistController.createGist);
router.get('/:id', gistController.getGist);
router.patch('/:id', gistController.updateGist);
router.delete('/:id', gistController.deleteGist);

module.exports = router;