// server.js

import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createLogger, format, transports } from 'winston';
import { authRoutes } from './server/routes/auth.js';
import { gistRoutes } from './server/routes/gists.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure required environment variables are present
if (!process.env.SESSION_SECRET || !process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.REDIRECT_URI) {
  throw new Error('Missing required environment variables. Please check your .env file.');
}

// Enable trust proxy for secure cookies behind a proxy (e.g., Heroku, Nginx)
app.set('trust proxy', 1);

// Winston logger configuration
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'gist-manager' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: format.simple() }));
}

// Middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret', // Make sure SESSION_SECRET is set in .env
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure cookies only in production
      httpOnly: true, // Prevent access to cookies via JavaScript
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Adjust for development
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Helmet for enhanced security headers
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
    crossOriginEmbedderPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// GitHub OAuth login route
app.get('/api/auth/github/login', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauth_state = state;

    console.log('Generated state:', state); // For debugging

    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ error: 'Failed to save session state.' });
      }

      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        scope: 'gist user',
        state,
      });

      res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
    });
  } catch (error) {
    console.error('Error generating state or saving session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/gists', gistRoutes);

// serve static from build dir
app.use(express.static(path.join(__dirname, 'build')));

app.use((req, res, next) => {
  console.log('Current session data:', req.session);
  next();
});

// fallback for React SPA
app.get('*', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });
  res.status(err.status || 500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
