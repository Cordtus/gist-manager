/**
 * Minimal OAuth Token Proxy
 * Handles GitHub token exchange (GitHub doesn't support CORS on token endpoint)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'build')));

// Token exchange endpoint
app.post('/api/auth/token', async (req, res) => {
	const { code, code_verifier } = req.body;

	if (!code) {
		return res.status(400).json({ error: 'Missing authorization code' });
	}

	try {
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				code,
				code_verifier
			})
		});

		const data = await response.json();

		if (data.error) {
			return res.status(400).json({ error: data.error, error_description: data.error_description });
		}

		res.json({ access_token: data.access_token });
	} catch (error) {
		console.error('Token exchange error:', error.message);
		res.status(500).json({ error: 'Token exchange failed' });
	}
});

// SPA fallback
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
