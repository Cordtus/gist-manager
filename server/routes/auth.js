// server/routes/auth.js

import express from 'express';
import axios from 'axios';

export const authRoutes = (stateStore) => {
  const router = express.Router();

  // POST /api/auth/github - Exchange authorization code for access token
  router.post('/github', async (req, res) => {
    const { code, state } = req.body;

    console.log('Received state:', state);

    // Validate code and state
    if (!code || !state) {
      console.error('OAuth callback error: Missing code or state.');
      return res.status(400).json({ error: 'Authorization code and state are required.' });
    }

    // Validate the state using stateStore
    const storedState = stateStore.get(state);
    if (!storedState) {
      console.error('Invalid or missing state parameter.');
      return res.status(400).json({ error: 'Invalid or missing state parameter.' });
    }

    // Remove the state after validation to prevent reuse
    stateStore.delete(state);

    try {
      // Exchange the authorization code for an access token
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.REDIRECT_URI,
        },
        { headers: { Accept: 'application/json' } }
      );

      const { access_token, error, error_description } = response.data;

      if (error || !access_token) {
        console.error('Error exchanging code for access token:', { error, error_description });
        return res.status(400).json({ error: error_description || 'Token exchange failed.' });
      }

      // Respond with the access token
      console.log('Access token successfully retrieved.');
      res.json({ access_token });
    } catch (err) {
      console.error('GitHub OAuth error:', err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
