require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
const gistRoutes = require('./server/routes/gists');

const app = express();
const port = process.env.PORT || 5000;

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'gist-manager' },
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

// Security middleware
app.use(helmet());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
//const limiter = rateLimit({
//  windowMs: 15 * 60 * 1000, // 15 minutes
//  max: 100 // limit each IP to 100 requests per windowMs
//});
// app.use(limiter);

app.use(cors({
  origin: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.set('trust proxy', true);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// GitHub OAuth route - Exchange code for access token
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
        client_secret: process.env.REACT_APP_GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token } = response.data;
    
    // Send access token back to frontend
    res.json({ access_token });
  } catch (error) {
    console.error('Error during GitHub authentication:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Endpoint to fetch authenticated user's data using the stored access token
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Gist routes
app.use('/api/gists', gistRoutes);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});