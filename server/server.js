/**
 * Gist Manager Server
 * Express.js server providing GitHub OAuth authentication, Gist API proxy,
 * and community gist sharing functionality.
 * @module server
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs').promises;
const logger = require('./utils/logger');

const gistRoutes = require('./routes/gists.js');
const sharedGistsRoutes = require('./routes/sharedGists.js');
const webhookRoutes = require('./routes/webhook.js');

const app = express();
const port = process.env.PORT || 5000;

app.set('trust proxy', true);

/**
 * Initialize required data directories
 * Creates /data and /data/shared-gists if they don't exist
 * @returns {Promise<void>}
 */
const ensureDataDirectory = async () => {
	const dataDir = path.join(__dirname, '../data');
	const sharedGistsDir = path.join(dataDir, 'shared-gists');

	try {
		await fs.mkdir(dataDir, { recursive: true });
		await fs.mkdir(sharedGistsDir, { recursive: true });
		logger.info('Data directories initialized');
	} catch (error) {
		logger.error('Error creating data directories', { error: error.message });
	}
};

ensureDataDirectory();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
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

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
	secret: sessionSecret,
	resave: false,
	saveUninitialized: true,
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
		maxAge: 24 * 60 * 60 * 1000,
		domain: process.env.COOKIE_DOMAIN || undefined
	},
	name: 'gist_manager_session'
}));

// Security headers
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
			scriptSrc: ["'self'", 'https://github.githubassets.com'],
			scriptSrcElem: ["'self'", 'https://github.githubassets.com'],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "https:"],
			frameSrc: ["'none'"]
		}
	},
	crossOriginEmbedderPolicy: false,
	crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Request logging
app.use(morgan('combined', {
	stream: { write: message => logger.info(message.trim()) }
}));

/**
 * Initiate GitHub OAuth flow
 * Generates state token for CSRF protection and returns authorization URL
 * @route GET /api/auth/github/login
 */
app.get('/api/auth/github/login', (req, res) => {
	const state = crypto.randomBytes(16).toString('hex');
	req.session.oauthState = state;
	const scopes = req.query.scopes || 'gist user';

	req.session.save((err) => {
		if (err) {
			logger.error('Failed to save session', { error: err.message });
		}

		logger.info('OAuth flow initiated', { sessionId: req.sessionID });

		const params = new URLSearchParams({
			client_id: process.env.GITHUB_CLIENT_ID,
			redirect_uri: process.env.REDIRECT_URI || `${req.protocol}://${req.get('host')}/callback`,
			scope: scopes,
			state: state
		});

		res.json({
			url: `https://github.com/login/oauth/authorize?${params.toString()}`,
			state: state
		});
	});
});

/**
 * Complete GitHub OAuth flow
 * Exchanges authorization code for access token, fetches user data
 * @route POST /api/auth/github
 */
app.post('/api/auth/github', async (req, res) => {
	try {
		const { code, state } = req.body;

		if (!code) {
			logger.error('No authorization code provided');
			return res.status(400).json({ error: 'Authorization code is required' });
		}

		logger.info('Processing code exchange', { sessionId: req.sessionID });

		// State validation (skip in development for easier testing)
		if (process.env.NODE_ENV !== 'development') {
			if (!req.session.oauthState && !state) {
				logger.error('No state available for validation');
				return res.status(400).json({
					error: 'Invalid state parameter',
					message: 'Authentication failed due to missing state. Please try logging in again.'
				});
			}

			if (req.session.oauthState && state !== req.session.oauthState) {
				logger.error('State validation failed', {
					expected: req.session.oauthState,
					received: state
				});
				return res.status(400).json({
					error: 'Invalid state parameter',
					message: 'Authentication failed due to invalid state.'
				});
			}
		}

		req.session.oauthState = null;

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
			logger.error('GitHub OAuth error', { error: githubError, description: error_description });
			return res.status(400).json({
				error: 'GitHub OAuth error',
				message: error_description || githubError
			});
		}

		if (!access_token) {
			logger.error('No access token received from GitHub');
			return res.status(400).json({ error: 'No access token received from GitHub' });
		}

		req.session.githubToken = access_token;

		// Fetch user data
		try {
			const userResponse = await axios.get('https://api.github.com/user', {
				headers: { Authorization: `Bearer ${access_token}` },
			});
			const { login, name, id, avatar_url, bio, created_at, public_repos, public_gists, followers, following } = userResponse.data;
			logger.info('User authenticated', { username: login });

			let email = null;
			try {
				const emailResponse = await axios.get('https://api.github.com/user/emails', {
					headers: { Authorization: `Bearer ${access_token}` },
				});

				const primaryEmail = emailResponse.data.find(email => email.primary);
				if (primaryEmail) {
					email = primaryEmail.email;
				}
			} catch {
				logger.warn('Could not fetch user email - scope might be missing');
			}

			req.session.user = {
				id, login, name, email, avatar_url, bio,
				created_at, public_repos, public_gists, followers, following
			};
		} catch (userError) {
			logger.warn('Could not fetch user data', { error: userError.message });
		}

		logger.info('Authentication successful');
		res.json({ access_token });

	} catch (error) {
		logger.error('Authentication failed', { error: error.message });

		res.status(500).json({
			error: 'Authentication failed',
			message: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
});

/**
 * Logout and destroy session
 * @route POST /api/auth/logout
 */
app.post('/api/auth/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			logger.error('Error destroying session', { error: err.message });
			return res.status(500).json({ error: 'Failed to logout' });
		}

		logger.info('User logged out');
		res.json({ message: 'Logged out successfully' });
	});
});

/**
 * Check authentication status
 * Returns user data if authenticated
 * @route GET /api/auth/status
 */
app.get('/api/auth/status', (req, res) => {
	if (req.session.githubToken && req.session.user) {
		res.json({ authenticated: true, user: req.session.user });
	} else {
		res.json({ authenticated: false });
	}
});

// Static file serving
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

app.get('/favicon.ico', (req, res) => {
	res.sendFile(path.join(__dirname, 'build/favicon.ico'));
});

app.get('/manifest.json', (req, res) => {
	res.sendFile(path.join(__dirname, 'build/manifest.json'));
});

app.use(express.static(path.join(__dirname, 'build'), {
	index: false,
	maxAge: '1d'
}));

// API routes
app.use('/api/gists', gistRoutes);
app.use('/api/shared-gists', sharedGistsRoutes);
app.use('/api/webhook', webhookRoutes);

// SPA catch-all
app.get('*', (req, res) => {
	if (req.path.startsWith('/api/')) {
		return res.status(404).json({ error: 'API endpoint not found' });
	}

	res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
	logger.error('Unhandled error', { error: err.message, stack: err.stack });

	res.status(err.status || 500).json({
		error: 'An unexpected error occurred',
		message: process.env.NODE_ENV === 'development' ? err.message : undefined
	});
});

app.listen(port, () => {
	logger.info(`Server running on port ${port}`);
});
