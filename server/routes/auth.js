// server/routes/auth.js

import express from 'express';
import axios from 'axios';

export const authRoutes = (stateStore) => {
  const router = express.Router();

  router.post('/github', async (req, res) => {
    const { code, state } = req.body;
  
    console.log('Received state from frontend:', state); // Debugging
    console.log('State store contents:', Array.from(stateStore.entries())); // Debugging
  
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state in OAuth callback.' });
    }
  
    if (!stateStore.has(state)) {
      console.error('State validation failed.');
      return res.status(400).json({ error: 'Invalid or missing state parameter.' });
    } 
  
    stateStore.delete(state);
    console.log('State validated and deleted.');

    try {
      // Exchange authorization code for access token
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

      const { access_token } = response.data;

      if (!access_token) {
        console.error('Error: No access token received.');
        return res.status(400).json({ error: 'Token exchange failed.' });
      }

      console.log('Access token retrieved:', access_token);

      // Respond with the access token
      res.json({ access_token });
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      res.status(500).json({
        error: error.response?.data?.error || 'Internal server error during token exchange.',
      });
    }
  });

  return router;
};
