// server/routes/gists.js

const express = require('express');
const router = express.Router();
const gistController = require('../controllers/gistController');

router.get('/', gistController.getGists);

router.post('/', gistController.createGist);

module.exports = router;