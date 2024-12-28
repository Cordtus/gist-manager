// server/routes/gists.js

import express from 'express';
import { getGists, createGist, updateGist, deleteGist } from '../controllers/gistController.js';

const router = express.Router();

// Middleware to validate GitHub access token
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid access token.' });
  }

  // Extract token and pass it to subsequent middleware/controllers
  const token = authHeader.split(' ')[1];
  req.github_token = token;
  next();
});

// Route definitions
router.get('/', getGists);
router.post('/', createGist);
router.patch('/:id', updateGist);
router.delete('/:id', deleteGist);

export const gistRoutes = router;
