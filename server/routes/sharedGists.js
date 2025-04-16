// server/routes/sharedGists.js

const express = require('express');
const router = express.Router();
const sharedGistsController = require('../controllers/sharedGistsController');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.user || !req.session.githubToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get all shared gists (public endpoint - no auth required)
router.get('/', sharedGistsController.getAllSharedGists);

// Share a gist (requires authentication)
router.post('/', isAuthenticated, sharedGistsController.shareGist);

// Unshare a gist (requires authentication)
router.delete('/:gistId', isAuthenticated, sharedGistsController.unshareGist);

// Check if a gist is shared (no auth required)
router.get('/check/:gistId', sharedGistsController.isGistShared);

// Get a user's shared gists (requires authentication)
router.get('/user', isAuthenticated, sharedGistsController.getUserSharedGists);

module.exports = router;