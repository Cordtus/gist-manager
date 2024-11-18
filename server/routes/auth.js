// server/routes/auth.js

const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST /auth/github route to exchange authorization code for access token
router.post('/auth/github', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
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
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = response.data.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    // Return access token to frontend
    res.json({ access_token: accessToken });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

module.exports = router;