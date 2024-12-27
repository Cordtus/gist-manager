// server/routes/gists.js

import express from 'express';
import { getGists, createGist, updateGist, deleteGist } from '../controllers/gistController.js';

const router = express.Router();

router.use((req, res, next) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: 'Unauthorized: Missing access token.' });
  }
  next();
});

router.get('/', getGists);
router.post('/', createGist);
router.patch('/:id', updateGist);
router.delete('/:id', deleteGist);

export const gistRoutes = router;
