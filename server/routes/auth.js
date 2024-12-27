// server/routes/auth.js

import express from 'express';
import session from 'express-session';
import axios from 'axios';

const router = express.Router();

// Configure session middleware
router.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret', // Use SESSION_SECRET instead of GITHUB_CLIENT_SECRET
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Protect cookies from being accessed by JavaScript
      maxAge: 24 * 60 * 60 * 1000, // 1-day expiration
    },
  })
);

// POST /auth/github route to exchange authorization code for access token
router.post('/github', async (req, res) => {
  const { code, state } = req.body;

  console.log('Received state from frontend:', state);
  console.log('Session state:', req.session?.oauth_state);

  if (!code || !state) {
    console.error('OAuth callback error: Missing code or state.');
    return res.status(400).json({ error: 'Missing code or state in OAuth callback.' });
  }

  if (state !== req.session.oauth_state) {
    console.error('OAuth callback error: State mismatch.', {
      expected: req.session?.oauth_state,
      received: state,
    });
    return res.status(400).json({ error: 'Invalid or missing state parameter.' });
  }

  try {
    // Exchange authorization code for an access token
    const { data } = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token, error, error_description } = data;

    if (error || !access_token) {
      console.error('GitHub OAuth error:', { error, error_description });
      return res
        .status(400)
        .json({ error: error_description || 'Failed to exchange code for access token.' });
    }

    // Store the access token in the session
    req.session.github_token = access_token;
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ error: 'Failed to save session.' });
      }
      console.log('Access token successfully saved to session.');
      res.json({ access_token });
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error_description || 'An error occurred while processing the request.';
    console.error('GitHub OAuth error:', errorMessage, error);
    res.status(status).json({ error: errorMessage });
  }
});

// Export the router
export { router as authRoutes };
