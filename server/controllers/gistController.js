const axios = require('axios');
const NodeCache = require('node-cache');
const winston = require('winston');
const crypto = require('crypto');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'gist-controller' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Setup cache
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Helper function to hash tokens for cache keys
// SECURITY: Include user info in hash to prevent cache collision
const hashToken = (token, userId = '') => {
  const data = userId ? `${token}_${userId}` : token;
  return crypto.createHash('sha256').update(data).digest('hex');
};

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

// Get a specific gist
exports.getGist = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.githubToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await githubApi.get(`/gists/${id}`, addAuthHeader(token));
    res.json(response.data);
  } catch (error) {
    logger.error('Error fetching gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Gist not found' });
    }
    
    res.status(500).json({ error: 'Error fetching gist', details: error.message });
  }
};

// Get Gists
exports.getGists = async (req, res) => {
  try {
    const token = req.session.githubToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Include user info if available from session
    const userId = req.session.user?.id || '';
    const tokenHash = hashToken(token, userId);
    const cacheKey = `gists-${tokenHash}`;
    
    const cachedGists = cache.get(cacheKey);
    
    if (cachedGists) {
      return res.json(cachedGists);
    }

    // Fetch all gists with pagination
    const allGists = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await githubApi.get(`/gists?per_page=${perPage}&page=${page}`, addAuthHeader(token));
      const gists = response.data;
      
      allGists.push(...gists);
      
      if (gists.length < perPage) {
        break; // Last page
      }
      page++;
    }
    
    cache.set(cacheKey, allGists);
    res.json(allGists);
  } catch (error) {
    logger.error('Error fetching gists:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }
    
    res.status(500).json({ error: 'Error fetching gists', details: error.message });
  }
};

// Create Gist
exports.createGist = async (req, res) => {
  try {
    const token = req.session.githubToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await githubApi.post('/gists', req.body, addAuthHeader(token));

    // Invalidate cache using hashed token with user ID
    const userId = req.session.user?.id || '';
    const tokenHash = hashToken(token, userId);
    cache.del(`gists-${tokenHash}`);
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error creating gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }
    if (error.response?.status === 422) {
      return res.status(422).json({ error: 'Invalid gist data', details: error.response.data });
    }

    res.status(500).json({ error: 'Error creating gist', details: error.message });
  }
};

// Update Gist
exports.updateGist = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.githubToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await githubApi.patch(`/gists/${id}`, req.body, addAuthHeader(token));

    // Invalidate cache using hashed token with user ID
    const userId = req.session.user?.id || '';
    const tokenHash = hashToken(token, userId);
    cache.del(`gists-${tokenHash}`);
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error updating gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Gist not found' });
    }

    res.status(500).json({ error: 'Error updating gist', details: error.message });
  }
};

// Delete Gist
exports.deleteGist = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.session.githubToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    await githubApi.delete(`/gists/${id}`, addAuthHeader(token));

    // Invalidate cache using hashed token with user ID
    const userId = req.session.user?.id || '';
    const tokenHash = hashToken(token, userId);
    cache.del(`gists-${tokenHash}`);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting gist:', error);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized access to GitHub API' });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Gist not found' });
    }

    res.status(500).json({ error: 'Error deleting gist', details: error.message });
  }
};