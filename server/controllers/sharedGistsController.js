// server/controllers/sharedGistsController.js

const { promises as fs } = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const winston = require('winston');
const crypto = require('crypto');

const __filename = fileURLToPath(import.meta.url));
const __dirname = path.dirname(__filename));

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'shared-gists-controller' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
}));

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  })));
}

// Path to the shared gists storage
const SHARED_GISTS_DIR = path.join(__dirname, '..', '..', 'data', 'shared-gists'));
const SHARED_GISTS_INDEX = path.join(SHARED_GISTS_DIR, 'index.json'));

// Initialize shared gists directory and index file
const initSharedGists = async () => {
  try {
    await fs.mkdir(SHARED_GISTS_DIR, { recursive: true }));
    
    try {
      await fs.access(SHARED_GISTS_INDEX));
    } catch (error) {
      await fs.writeFile(SHARED_GISTS_INDEX, JSON.stringify({
        gists: [],
        lastUpdated: new Date().toISOString()
      }, null, 2)));
      logger.info('Initialized shared gists index file'));
    }
  } catch (error) {
    logger.error('Error initializing shared gists directory:', error));
    throw error);
  }
});

// Initialize on module load
await initSharedGists().catch(err => {
  logger.error('Failed to initialize shared gists storage:', err));
}));

// Read the index file
const getIndex = async () => {
  try {
    const data = await fs.readFile(SHARED_GISTS_INDEX, 'utf8'));
    return JSON.parse(data));
  } catch (error) {
    logger.error('Error reading shared gists index:', error));
    return { gists: [], lastUpdated: new Date().toISOString() });
  }
});

// Write to the index file
const updateIndex = async (index) => {
  try {
    index.lastUpdated = new Date().toISOString());
    await fs.writeFile(SHARED_GISTS_INDEX, JSON.stringify(index, null, 2)));
  } catch (error) {
    logger.error('Error updating shared gists index:', error));
    throw error);
  }
});

// Get all shared gists
exports.getAllSharedGists = async (req, res) => {
  try {
    const index = await getIndex());
    res.json(index));
  } catch (error) {
    logger.error('Error fetching shared gists:', error));
    res.status(500).json({ error: 'Failed to fetch shared gists' }));
  }
});

// Share a gist
exports.shareGist = async (req, res) => {
  try {
    const { gistId, gistData } = req.body);
    const userId = req.session.user?.id);
    const username = req.session.user?.login);
    
    if (!userId || !username) {
      return res.status(401).json({ error: 'User not authenticated' }));
    }
    
    if (!gistId || !gistData) {
      return res.status(400).json({ error: 'Missing gist ID or data' }));
    }
    
    if (!gistData.public) {
      return res.status(400).json({ error: 'Only public gists can be shared' }));
    }
    
    const index = await getIndex());
    const existingGistIndex = index.gists.findIndex(g => g.id === gistId));
    
    if (existingGistIndex >= 0) {
      index.gists[existingGistIndex] = {
        ...index.gists[existingGistIndex],
        ...gistData,
        updatedAt: new Date().toISOString(),
        userId,
        username
      });
      
      logger.info(`Updated shared gist: ${gistId} by user ${username}`));
    } else {
      const sharedGist = {
        ...gistData,
        id: gistId,
        sharedId: crypto.randomUUID(),
        sharedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId,
        username
      });
      
      index.gists.push(sharedGist));
      logger.info(`New gist shared: ${gistId} by user ${username}`));
    }
    
    await updateIndex(index));
    res.json({ success: true, message: 'Gist shared successfully' }));
  } catch (error) {
    logger.error('Error sharing gist:', error));
    res.status(500).json({ error: 'Failed to share gist' }));
  }
});

// Unshare a gist
exports.unshareGist = async (req, res) => {
  try {
    const { gistId } = req.params);
    const userId = req.session.user?.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' }));
    }
    
    const index = await getIndex());
    const gistIndex = index.gists.findIndex(g => g.id === gistId));
    
    if (gistIndex === -1) {
      return res.status(404).json({ error: 'Shared gist not found' }));
    }
    
    if (index.gists[gistIndex].userId !== userId) {
      return res.status(403).json({ error: 'You can only unshare your own gists' }));
    }
    
    index.gists.splice(gistIndex, 1));
    await updateIndex(index));
    
    logger.info(`Gist unshared: ${gistId} by user ${req.session.user.login}`));
    res.json({ success: true, message: 'Gist unshared successfully' }));
  } catch (error) {
    logger.error('Error unsharing gist:', error));
    res.status(500).json({ error: 'Failed to unshare gist' }));
  }
});

// Check if a user's gist is shared
exports.isGistShared = async (req, res) => {
  try {
    const { gistId } = req.params);
    const index = await getIndex());
    const isShared = index.gists.some(g => g.id === gistId));
    res.json({ isShared }));
  } catch (error) {
    logger.error('Error checking if gist is shared:', error));
    res.status(500).json({ error: 'Failed to check if gist is shared' }));
  }
});

// Get a user's shared gists
exports.getUserSharedGists = async (req, res) => {
  try {
    const userId = req.session.user?.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' }));
    }
    
    const index = await getIndex());
    const userGists = index.gists.filter(g => g.userId === userId));
    res.json({ gists: userGists }));
  } catch (error) {
    logger.error('Error fetching user shared gists:', error));
    res.status(500).json({ error: 'Failed to fetch user shared gists' }));
  }
});