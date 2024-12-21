// server/controllers/gistController.js

import axios from 'axios';
import NodeCache from 'node-cache';
import { createLogger, format, transports } from 'winston';
import crypto from 'crypto';

// Setup logger
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'gist-controller' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: format.simple() }));
}

// Setup cache
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Helper function to hash tokens for cache keys
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Create a reusable Axios instance for GitHub API requests
const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

// Middleware to add authorization headers dynamically
const addAuthHeader = (token) => ({
  headers: {
    Authorization: `token ${token}`,
  },
});

// Get Gists
export const getGists = async (req, res) => {
  try {
    const tokenHash = hashToken(req.headers.authorization);
    const cacheKey = `gists-${tokenHash}`;

    const cachedGists = cache.get(cacheKey);

    if (cachedGists) {
      return res.json(cachedGists);
    }

    const response = await githubApi.get('/gists', addAuthHeader(req.headers.authorization));

    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('Error fetching gists:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }

    res.status(500).json({ error: 'Error fetching gists', details: error.message });
  }
};

// Create Gist
export const createGist = async (req, res) => {
  try {
    const response = await githubApi.post('/gists', req.body, addAuthHeader(req.headers.authorization));

    // Invalidate cache using hashed token
    const tokenHash = hashToken(req.headers.authorization);
    cache.del(`gists-${tokenHash}`);

    res.json(response.data);
  } catch (error) {
    logger.error('Error creating gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }

    res.status(500).json({ error: 'Error creating gist', details: error.message });
  }
};

// Update Gist
export const updateGist = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await githubApi.patch(`/gists/${id}`, req.body, addAuthHeader(req.headers.authorization));

    // Invalidate cache using hashed token
    const tokenHash = hashToken(req.headers.authorization);
    cache.del(`gists-${tokenHash}`);

    res.json(response.data);
  } catch (error) {
    logger.error('Error updating gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }

    res.status(500).json({ error: 'Error updating gist', details: error.message });
  }
};

// Delete Gist
export const deleteGist = async (req, res) => {
  try {
    const { id } = req.params;

    await githubApi.delete(`/gists/${id}`, addAuthHeader(req.headers.authorization));

    // Invalidate cache using hashed token
    const tokenHash = hashToken(req.headers.authorization);
    cache.del(`gists-${tokenHash}`);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }

    res.status(500).json({ error: 'Error deleting gist', details: error.message });
  }
};
