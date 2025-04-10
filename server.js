// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cors config
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://gistmd.basementnodes.ca',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Session configuration with secure secret
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

// Add security headers with appropriate CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.github.com", "https://github.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
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

// GITHUB OAUTH ROUTES

// login route - generate state
app.get('/api/auth/github/login', (req, res) => {
  // Generate a secure random state
  const state = crypto.randomBytes(16).toString('hex');
  
  // store state in session
  req.session.oauthState = state;
  
  logger.info(`[OAuth] Generated state: ${state} and stored in session`);

  // Build the GitHub OAuth URL with appropriate parameters
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI || `${req.protocol}://${req.get('host')}/callback`,
    scope: 'gist user',
    state: state
  });

  // Return the authorization URL to the client
  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback route to exchange code for an access token
app.post('/api/auth/github', async (req, res) => {
  try {
    const { code, state } = req.body;

    // Ensure code is provided
    if (!code) {
      logger.error('[OAuth] No authorization code provided');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Log request details for debugging
    logger.info(`[OAuth] Received code exchange request:`);
    logger.info(`  - State from client: ${state}`);
    logger.info(`  - State from session: ${req.session.oauthState}`);
    
    // validate state (in prod only)
    if (process.env.NODE_ENV !== 'development') {
      if (!req.session.oauthState || state !== req.session.oauthState) {
        logger.error('[OAuth] State validation failed');
        return res.status(400).json({ 
          error: 'Invalid state parameter',
          message: 'Authentication failed due to invalid state. This could be a CSRF attempt or session expiration.'
        });
      }
    } else if (!req.session.oauthState) {
      logger.warn('[OAuth] No state found in session but proceeding (development mode)');
    } else if (state !== req.session.oauthState) {
      logger.warn(`[OAuth] State mismatch but proceeding (development mode): ${state} vs ${req.session.oauthState}`);
    }

    // clear state after each use
    req.session.oauthState = null;
    logger.info('[OAuth] State cleared from session');

    // determine redirect URI
    const effectiveRedirectUri = 
      process.env.REDIRECT_URI || 
      `${req.protocol}://${req.get('host')}/callback`;
      
    // exchange the auth code for token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: effectiveRedirectUri,
      },
      { headers: { Accept: 'application/json' } }
    );

    // check if received valid token
    const { access_token, error: githubError, error_description } = tokenResponse.data;

    if (githubError) {
      logger.error(`[OAuth] GitHub error: ${githubError} - ${error_description}`);
      return res.status(400).json({ 
        error: 'GitHub OAuth error', 
        message: error_description || githubError 
      });
    }

    if (!access_token) {
      logger.error('[OAuth] No access token received from GitHub');
      return res.status(400).json({ error: 'No access token received from GitHub' });
    }

    // store token in session
    req.session.githubToken = access_token;

    // fetch user for verification
    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { login, name, id } = userResponse.data;
      logger.info(`[OAuth] Successfully authenticated user: ${login}`);
      
      // store user session info
      req.session.user = {
        id,
        login,
        name
      };
    } catch (userError) {
      logger.warn('[OAuth] Could not fetch user data, but token was received:', userError.message);
    }

    // return access token to client
    logger.info('[OAuth] Authentication successful, returning token');
    res.json({ access_token });
      
  } catch (error) {
    logger.error('[OAuth] Error during GitHub authentication:', error.message);
    
    if (error.response) {
      logger.error('[OAuth] Error details:', JSON.stringify(error.response.data));
    }
    
    res.status(500).json({ 
      error: 'Authentication failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      logger.error('[OAuth] Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    logger.info('[OAuth] User logged out successfully');
    res.json({ message: 'Logged out successfully' });
  });
});

// verify auth
app.get('/api/auth/status', (req, res) => {
  if (req.session.githubToken && req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// API ROUTES

app.use('/api/gists', gistRoutes);

// SERVING STATIC FILES

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ERROR HANDLING

// global error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  
  // send error response
  res.status(err.status || 500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  console.log(`Server running on port ${port}`);
});