// server.js - ESM VERSION

import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import winston from 'winston';
import session from 'express-session';
import crypto from 'crypto';
import { promises as fs } from 'fs';

// Import API routes
import gistRoutes from './server/routes/gists.js';
import sharedGistsRoutes from './server/routes/sharedGists.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// ensure data dir exists
const ensureDataDirectory = async () => {
  const dataDir = path.join(__dirname, 'data');
  const sharedGistsDir = path.join(dataDir, 'shared-gists');
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(sharedGistsDir, { recursive: true });
    console.log('Data directories initialized');
  } catch (error) {
    console.error('Error creating data directories:', error);
  }
};

// init data dir
await ensureDataDirectory();

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
      'http://localhost:3020',
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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

// CSP config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || 'http://localhost:3020',
        'https://api.github.com',
        'https://github.com'
      ],
      scriptSrc: [
        "'self'",
        'https://github.githubassets.com'
      ],
      scriptSrcElem: [
        "'self'",
        'https://github.githubassets.com'
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
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
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const scopes = req.query.scopes || 'gist user';
  
  logger.info(`[OAuth] Generated state: ${state} and stored in session`);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI || `${req.protocol}://${req.get('host')}/callback`,
    scope: scopes,
    state: state
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback route
app.post('/api/auth/github', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      logger.error('[OAuth] No authorization code provided');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

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

    req.session.oauthState = null;
    logger.info('[OAuth] State cleared from session');

    const effectiveRedirectUri = 
      process.env.REDIRECT_URI || 
      `${req.protocol}://${req.get('host')}/callback`;
      
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

    req.session.githubToken = access_token;

    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { login, name, id, avatar_url, bio, created_at, public_repos, public_gists, followers, following } = userResponse.data;
      logger.info(`[OAuth] Successfully authenticated user: ${login}`);
      
      let email = null;
      try {
        const emailResponse = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        
        const primaryEmail = emailResponse.data.find(email => email.primary);
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      } catch (emailError) {
        logger.warn('[OAuth] Could not fetch user email - email scope might be missing');
      }
      
      req.session.user = {
        id,
        login,
        name,
        email,
        avatar_url,
        bio,
        created_at,
        public_repos,
        public_gists,
        followers,
        following
      };
    } catch (userError) {
      logger.warn('[OAuth] Could not fetch user data, but token was received:', userError.message);
    }

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

// STATIC FILE SERVING
app.use('/static', express.static(path.join(__dirname, 'build/static'), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.map')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Serve favicon and manifest
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/favicon.ico'));
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/manifest.json'));
});

// Serve other static assets
app.use(express.static(path.join(__dirname, 'build'), {
  index: false,
  maxAge: '1d'
}));

// API ROUTES
app.use('/api/gists', gistRoutes);
app.use('/api/shared-gists', sharedGistsRoutes);

// CATCH-ALL ROUTE - Must be LAST
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ERROR HANDLING
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  
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