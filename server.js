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
    maxAge: 3600000 // Session expiration (1 hour)
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

// ====== GITHUB OAUTH ROUTES ======

// GitHub OAuth login route - generate state and return auth URL
app.get('/api/auth/github/login', (req, res) => {
  // Generate a secure random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session for verification after redirect
  req.session.oauth_state = state;
  
  logger.info(`[OAuth] Generated state: ${state} and stored in session`);
  console.log(`[OAuth] Generated state: ${state} and stored in session`);

  // Build the GitHub OAuth URL with appropriate parameters
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI || `${req.protocol}://${req.get('host')}/callback`,
    scope: 'gist user', // Request gist and user permissions
    state: state // Include state for CSRF protection
  });

  // Return the complete GitHub authorization URL to the client
  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback route to exchange code for an access token
app.post('/api/auth/github', async (req, res) => {
  try {
    const { code, state, skipValidation } = req.body;

    // Ensure code is provided
    if (!code) {
      logger.error('[OAuth] No authorization code provided');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Log received state and session state for debugging
    const sessionState = req.session.oauth_state || null;
    logger.info(`[OAuth] Received code exchange request:`);
    logger.info(`  - State from client: ${state}`);
    logger.info(`  - State from session: ${sessionState}`);
    logger.info(`  - Skip validation flag: ${skipValidation}`);
    console.log(`[OAuth] Received code exchange request:`);
    console.log(`  - State from client: ${state}`);
    console.log(`  - State from session: ${sessionState}`);
    console.log(`  - Skip validation flag: ${skipValidation}`);

    // Determine if state validation should be skipped
    const shouldSkipValidation = 
      skipValidation === true || // Client explicitly requested to skip
      process.env.NODE_ENV === 'development' && process.env.SKIP_OAUTH_STATE_VALIDATION === 'true'; // Environment setting
    
    if (!shouldSkipValidation) {
      // Validate the state parameter to prevent CSRF attacks
      if (!state) {
        logger.error('[OAuth] Missing state parameter');
        return res.status(400).json({ error: 'State parameter is required' });
      }
      
      if (!sessionState) {
        logger.error('[OAuth] No state found in session');
        return res.status(400).json({ 
          error: 'Session state not found', 
          message: 'Your session may have expired. Please try logging in again.'
        });
      }
      
      if (state !== sessionState) {
        logger.error(`[OAuth] State mismatch: expected ${sessionState}, got ${state}`);
        return res.status(400).json({ 
          error: 'Invalid state parameter',
          message: 'The state parameter does not match. This may indicate a CSRF attack.'
        });
      }
      
      logger.info('[OAuth] State parameter validated successfully');
      console.log('[OAuth] State parameter validated successfully');
    } else {
      logger.warn('[OAuth] State validation skipped (development mode)');
      console.warn('[OAuth] State validation skipped (development mode)');
    }

    // Clear the state from session after validation
    delete req.session.oauth_state;
    logger.info('[OAuth] State cleared from session');

    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI || `${req.protocol}://${req.get('host')}/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    // Check if we received a valid access token
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

    // Fetch user data for verification (optional)
    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { login, name } = userResponse.data;
      logger.info(`[OAuth] Successfully authenticated user: ${login}`);
      console.log(`[OAuth] Successfully authenticated user: ${login} (${name || 'unnamed'})`);
    } catch (userError) {
      logger.warn('[OAuth] Could not fetch user data, but token was received:', userError.message);
    }

    // Return the access token to the client
    logger.info('[OAuth] Authentication successful, returning token');
    res.json({ access_token });
    
  } catch (error) {
    logger.error('[OAuth] Error during GitHub authentication:', error.message);
    
    if (error.response) {
      logger.error('[OAuth] Error details:', JSON.stringify(error.response.data));
    }
    
    res.status(500).json({ 
      error: 'Authentication failed', 
      message: error.message 
    });
  }
});

// ====== API ROUTES ======

// Gist API routes
app.use('/api/gists', gistRoutes);

// ====== SERVING STATIC FILES ======

// Serve static files from build folder (for React frontend)
app.use(express.static(path.join(__dirname, 'build')));

// Catchall handler for serving React app (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ====== ERROR HANDLING ======

// Global error handler middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  
  // Send appropriate error response
  res.status(err.status || 500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ====== SERVER STARTUP ======

// Start the server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  console.log(`Server running on port ${port}`);
});