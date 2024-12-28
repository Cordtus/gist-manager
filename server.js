// server.js

import dotenv from 'dotenv';
import express from 'express';
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

// In-memory OAuth state store
const stateStore = new Map(); // Use Map to store states with timestamps

// Logger configuration
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
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
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
  })
);
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
    const state = crypto.randomBytes(16).toString('hex'); // Generate a secure state
    stateStore.set(state, { createdAt: Date.now() }); // Save the state with a timestamp

    console.log('Generated state:', state); // Debugging

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      scope: 'gist user',
      state,
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  } catch (error) {
    console.error('Error generating state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to clean up expired states
app.use((req, res, next) => {
  const cleanupThreshold = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  // Remove expired states
  for (const [key, { createdAt }] of stateStore.entries()) {
    if (now - createdAt > cleanupThreshold) {
      stateStore.delete(key);
    }
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes(stateStore)); // Pass stateStore to auth routes
app.use('/api/gists', gistRoutes);

// Serve React static files
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
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

// Start the server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
