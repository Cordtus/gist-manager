// server/routes/auth.js

import express from 'express';
import axios from 'axios';

export const authRoutes = () => {
  const router = express.Router();

  // GitHub OAuth Callback
  router.post('/github', async (req, res) => {
    const { code } = req.body;
    const state = req.cookies.oauth_state; // Retrieve stored state from cookies

    console.log('State from cookie:', state);
    console.log('Code from request body:', code);

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state in OAuth callback.' });
    }

    try {
      // Exchange authorization code for access token
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.REDIRECT_URI,
          state, // Ensure state validation
        },
        { headers: { Accept: 'application/json' } }
      );

      const { access_token } = response.data;

      if (!access_token) {
        console.error('Error: No access token received.');
        return res.status(400).json({ error: 'Token exchange failed.' });
      }

      console.log('Access token retrieved:', access_token);

      // Clear cookie after successful auth
      res.clearCookie('oauth_state');

      // Respond with the access token
      res.json({ access_token });
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      res.status(500).json({
        error: error.response?.data?.error || 'Internal server error during token exchange.',
      });
    }
  });

  // Logout Route
  router.post('/logout', (req, res) => {
    console.log('Logout initiated.');
    res.clearCookie('oauth_state'); // Clear any OAuth-related cookies
    res.status(200).json({ message: 'Logout successful' });
  });

  return router;
};
