const axios = require('axios');
const NodeCache = require('node-cache');
const winston = require('winston');

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

exports.getGists = async (req, res) => {
  try {
    const cacheKey = `gists-${req.headers.authorization}`;
    const cachedGists = cache.get(cacheKey);
    
    if (cachedGists) {
      return res.json(cachedGists);
    }

    const response = await axios.get('https://api.github.com/gists', {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    logger.error('Error fetching gists:', error);
    res.status(500).json({ error: 'Error fetching gists', details: error.message });
  }
};

exports.createGist = async (req, res) => {
  try {
    const response = await axios.post('https://api.github.com/gists', req.body, {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    
    // Invalidate cache
    cache.del(`gists-${req.headers.authorization}`);
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error creating gist:', error);
    res.status(500).json({ error: 'Error creating gist', details: error.message });
  }
};

exports.updateGist = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.patch(`https://api.github.com/gists/${id}`, req.body, {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    
    // Invalidate cache
    cache.del(`gists-${req.headers.authorization}`);
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error updating gist:', error);
    res.status(500).json({ error: 'Error updating gist', details: error.message });
  }
};

exports.deleteGist = async (req, res) => {
  try {
    const { id } = req.params;
    await axios.delete(`https://api.github.com/gists/${id}`, {
      headers: { Authorization: `token ${req.headers.authorization}` }
    });
    
    // Invalidate cache
    cache.del(`gists-${req.headers.authorization}`);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting gist:', error);
    res.status(500).json({ error: 'Error deleting gist', details: error.message });
  }
};