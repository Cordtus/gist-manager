const express = require('express');
const sharedGistsController = require('../controllers/sharedGistsController.js');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
  if (!req.session.user || !req.session.githubToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.get('/', sharedGistsController.getAllSharedGists);
router.post('/', isAuthenticated, sharedGistsController.shareGist);
router.delete('/:gistId', isAuthenticated, sharedGistsController.unshareGist);
router.get('/check/:gistId', sharedGistsController.isGistShared);
router.get('/user', isAuthenticated, sharedGistsController.getUserSharedGists);

module.exports = router;