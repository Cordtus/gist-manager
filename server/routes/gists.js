// server/routes/gists.js

import express from 'express';
import * as gistController from '../controllers/gistController.js';

const router = express.Router();

// Get all gists for authenticated user
router.get('/', gistController.getGists);

// Create a new gist
router.post('/', gistController.createGist);

// Get a specific gist by ID
router.get('/:id', gistController.getGist);

// Update a gist
router.patch('/:id', gistController.updateGist);

// Delete a gist
router.delete('/:id', gistController.deleteGist);

export default router;