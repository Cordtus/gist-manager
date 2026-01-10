/**
 * Shared Gists Routes
 * API endpoints for community gist sharing functionality.
 * Public gists can be shared with the community and browsed by all users.
 * @module routes/sharedGists
 */

const express = require('express');
const sharedGistsController = require('../controllers/sharedGistsController.js');

const router = express.Router();

/**
 * Authentication middleware
 * Verifies user has valid session with GitHub credentials
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const isAuthenticated = (req, res, next) => {
	if (!req.session.user || !req.session.githubToken) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	next();
};

// Public routes - no auth required
router.get('/', sharedGistsController.getAllSharedGists);
router.get('/check/:gistId', sharedGistsController.isGistShared);

// Protected routes - auth required
router.post('/', isAuthenticated, sharedGistsController.shareGist);
router.delete('/:gistId', isAuthenticated, sharedGistsController.unshareGist);
router.get('/user', isAuthenticated, sharedGistsController.getUserSharedGists);

module.exports = router;
