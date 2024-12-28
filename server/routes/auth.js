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

  console.log('Received state from client:', state); // Debug
  console.log('Stored state in session:', req.session?.oauth_state); // Debug

  if (!code || !state) {
    console.error('OAuth callback error: Missing code or state.');
    return res.status(400).json({ error: 'Authorization code and state are required.' });
  }

  if (!req.session?.oauth_state) {
    console.error('Session state is missing or invalid.');
    return res.status(400).json({ error: 'Session state is missing or invalid.' });
  }

  if (state !== req.session.oauth_state) {
    console.error('State mismatch detected', { expected: req.session.oauth_state, received: state });
    return res.status(400).json({ error: 'Invalid state parameter. Possible CSRF detected.' });
  }

  // Clear state after validation
  req.session.oauth_state = null;

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

    const { access_token, error, error_description } = tokenResponse.data;

    if (error || !access_token) {
      console.error('Error exchanging code for access token:', { error, error_description });
      return res.status(400).json({ error: error_description || 'Token exchange failed.' });
    }

    req.session.github_token = access_token;
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ error: 'Failed to save session.' });
      }

      console.log('Access token successfully saved to session.');
      res.json({ access_token });
    });
  } catch (err) {
    console.error('GitHub OAuth error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Internal server error' });
  }
});

// Export the router
export { router as authRoutes };
