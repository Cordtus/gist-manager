/**
 * API Configuration
 * Centralized configuration for GitHub API interactions.
 * @module config/api
 */

/**
 * GitHub OAuth configuration
 */
export const GITHUB_CONFIG = {
	clientId: process.env.REACT_APP_GITHUB_CLIENT_ID,
	redirectUri: process.env.REACT_APP_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/callback` : 'http://localhost:3000/callback'),
	scopes: 'gist user user:email'
};

/**
 * GitHub API configuration
 */
export const GITHUB_API = {
	baseURL: 'https://api.github.com',
	headers: {
		Accept: 'application/vnd.github.v3+json'
	}
};

/**
 * Request configuration defaults
 */
export const REQUEST_CONFIG = {
	timeout: 30000,
	headers: {
		'Content-Type': 'application/json'
	}
};
