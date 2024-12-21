// server.js

import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from 'winston';
import { authRoutes } from './server/routes/auth.js';
import { gistRoutes } from './server/routes/gists.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable trust proxy
app.set('trust proxy', true);

// Setup logger
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'gist-manager' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: format.simple() }));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600000, // Set session expiration (1 hour)
    },
  })
);

// Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.github.com', 'https://github.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// GitHub OAuth login route
app.get('/api/auth/github/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauth_state = state;

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    scope: 'gist user',
    state,
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback route to exchange code for an access token
app.post('/api/auth/github', async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    logger.error('GitHub OAuth: Missing authorization code');
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  if (state !== req.session.oauth_state) {
    logger.error('GitHub OAuth: Invalid state parameter', {
      receivedState: state,
      expectedState: req.session.oauth_state,
    });
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    logger.info('GitHub OAuth: Exchanging authorization code for access token', { code });
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

    const { access_token, error, error_description } = tokenResponse.data;

    if (error) {
      logger.error('GitHub OAuth: Error in access token response', { error, error_description });
      return res.status(400).json({ error: error_description || 'Failed to fetch access token' });
    }

    logger.info('GitHub OAuth: Successfully received access token', { access_token });

    // Store access_token securely in an HTTP-only cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 3600000, // Token valid for 1 hour
    });

    logger.info('GitHub OAuth: Fetching user data with access token');
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    logger.info('GitHub OAuth: Successfully fetched user data', { user: userResponse.data });

    res.json({ user: userResponse.data });
  } catch (error) {
    if (error.response) {
      logger.error('GitHub OAuth: API error response', {
        status: error.response.status,
        data: error.response.data,
      });
      return res.status(500).json({ error: error.response.data || 'GitHub API error' });
    }

    logger.error('GitHub OAuth: Unexpected error', { message: error.message });
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Fetch current authenticated user details using access token from cookies
app.get('/api/auth/me', async (req, res) => {
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    logger.warn('GitHub API: No access token in cookies');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    logger.info('GitHub API: Fetching user data with access token');
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    logger.info('GitHub API: Successfully fetched user data', { user: response.data });
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      logger.warn('GitHub API: Invalid access token', { status: error.response.status });
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.error('GitHub API: Failed to fetch user data', { message: error.message });
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
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
