// server/routes/gists.js

import express from 'express';
import { getGists, createGist, updateGist, deleteGist } from '../controllers/gistController.js';

const router = express.Router();

router.get('/', getGists);
router.post('/', createGist);
router.patch('/:id', updateGist);
router.delete('/:id', deleteGist);

export const gistRoutes = router;
