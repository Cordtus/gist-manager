const express = require('express'));
const gistController = require('../controllers/gistController.js'));

const router = express.Router());

router.get('/', gistController.getGists));
router.post('/', gistController.createGist));
router.get('/:id', gistController.getGist));
router.patch('/:id', gistController.updateGist));
router.delete('/:id', gistController.deleteGist));

module.exports = router);
