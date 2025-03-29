// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const authRoutes = require('./server/routes/auth');
const gistRoutes = require('./server/routes/gists');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 5000;

// Enable trust proxy
app.set('trust proxy', true);

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 3600000 // Set session expiration (1 hour)
  }
}));

// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.github.com", "https://github.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: message => logger.info(message.trim())
  }
}));

// GitHub OAuth login route
app.get('/api/auth/github/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauth_state = state;

  console.log(`Generated state: ${state}`); // Debugging log for state

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'gist user',
    state
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback route to exchange code for an access token
app.post('/api/auth/github', async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  console.log(`Received state: ${state}, Stored state: ${req.session.oauth_state}`); // Debugging log for state

  if (!state || state !== req.session.oauth_state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Store access_token securely in an HTTP-only cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 3600000 // Token valid for 1 hour
    });

    // Fetch user data from GitHub API using access token
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json({ user: userResponse.data });
    
  } catch (error) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Fetch current authenticated user details using access token from cookies
app.get('/api/auth/me', async (req, res) => {
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
    
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.error('GitHub API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Gist routes
app.use('/api/gists', gistRoutes);

// Serve static files from build folder (for React frontend)
app.use(express.static(path.join(__dirname, 'build')));

// Catchall handler for serving React app (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handler middleware
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
