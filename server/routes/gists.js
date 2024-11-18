// server/routes/gists.js

const express = require('express');
const router = express.Router();
const gistController = require('../controllers/gistController');

router.get('/', async (req, res, next) => {
  try {
    await gistController.getGists(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    await gistController.createGist(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;