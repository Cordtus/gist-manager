/**
 * Authentication Service
 * Handles GitHub OAuth PKCE flow and session management.
 * @module services/api/auth
 */

import axios from 'axios';
import { setAuthToken } from './github';
import { logInfo, logError, trackError, ErrorCategory } from '../../utils/logger';

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * @returns {string} Base64url-encoded random string (43-128 chars)
 */
export const generateCodeVerifier = () => {
	const array = new Uint8Array(32);
	if (typeof window !== 'undefined' && window.crypto) {
		window.crypto.getRandomValues(array);
	} else {
		for (let i = 0; i < array.length; i++) {
			array[i] = Math.floor(Math.random() * 256);
		}
	}
	return base64UrlEncode(array);
};

/**
 * Generate SHA-256 code challenge from verifier for PKCE
 * @param {string} verifier - The code verifier string
 * @returns {Promise<string>} Base64url-encoded SHA-256 hash
 */
export const generateCodeChallenge = async (verifier) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(new Uint8Array(hash));
};

/**
 * Base64url encode a Uint8Array (URL-safe base64 without padding)
 * @param {Uint8Array} buffer - The buffer to encode
 * @returns {string} Base64url-encoded string
 */
export const base64UrlEncode = (buffer) => {
	return btoa(String.fromCharCode(...buffer))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
};

/**
 * Generate a secure random state parameter for OAuth CSRF protection
 * @returns {string} Random hex string
 */
export const generateOAuthState = () => {
	const array = new Uint8Array(32);
	if (typeof window !== 'undefined' && window.crypto) {
		window.crypto.getRandomValues(array);
	} else {
		for (let i = 0; i < array.length; i++) {
			array[i] = Math.floor(Math.random() * 256);
		}
	}
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Exchange authorization code for access token via local proxy
 * (GitHub's token endpoint doesn't support CORS)
 *
 * @param {string} code - The authorization code from GitHub OAuth redirect
 * @param {string} codeVerifier - The PKCE code verifier stored during login initiation
 * @returns {Promise<string>} The access token
 */
export const exchangeCodeForToken = async (code, codeVerifier) => {
	try {
		logInfo('Exchanging authorization code for token');

		const response = await axios.post('/api/auth/token', {
			code,
			code_verifier: codeVerifier
		});

		if (!response.data || !response.data.access_token) {
			const errorMsg = response.data?.error_description || response.data?.error || 'No access token received';
			logError('Token exchange failed', { error: errorMsg });
			trackError(new Error(errorMsg), ErrorCategory.AUTHENTICATION, {
				step: 'exchangeCodeForToken',
				hasError: !!response.data?.error
			});
			throw new Error(errorMsg);
		}

		const accessToken = response.data.access_token;
		logInfo('Successfully received access token');

		setAuthToken(accessToken);

		return accessToken;
	} catch (error) {
		logError('GitHub token exchange error', {
			message: error.message,
			status: error.response?.status
		});

		trackError(error, ErrorCategory.AUTHENTICATION, {
			step: 'exchangeCodeForToken',
			status: error.response?.status
		});

		if (error.response?.data?.error_description) {
			throw new Error(error.response.data.error_description);
		}
		throw error;
	}
};

/**
 * Get the current authenticated user from GitHub
 * @returns {Promise<Object>} The user data
 */
export const getCurrentUser = async () => {
	try {
		let token = null;

		try {
			const sessionData = sessionStorage.getItem('gist_manager_session');
			if (sessionData) {
				const { token: sessionToken, expiration } = JSON.parse(sessionData);
				if (expiration && new Date().getTime() < expiration) {
					token = sessionToken;
				}
			}
		} catch (e) {
			logError('Error retrieving token from session data', { error: e.message });
		}

		if (!token) {
			token = sessionStorage.getItem('github_token');
		}

		if (!token) {
			const error = new Error('No authentication token found');
			logError('No authentication token found');
			trackError(error, ErrorCategory.AUTHENTICATION, { step: 'getCurrentUser' });
			throw error;
		}

		logInfo('Fetching current user data from GitHub API');
		const response = await axios.get('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		logInfo('Successfully fetched user data', { username: response.data.login });
		return response.data;
	} catch (error) {
		logError('Error fetching current user', { error: error.message });

		trackError(error, ErrorCategory.AUTHENTICATION, {
			step: 'getCurrentUser',
			status: error.response?.status
		});

		if (error.response?.status === 401) {
			throw new Error('Authentication token is invalid or expired. Please log in again.');
		} else if (error.response) {
			throw new Error(`GitHub API error: ${error.response.data?.message || 'Unknown error'}`);
		} else if (error.request) {
			throw new Error('No response received from GitHub. Please check your network connection.');
		} else {
			throw error;
		}
	}
};

/**
 * Handle OAuth callback - verify state and exchange code for token
 *
 * @param {string} code - Authorization code from GitHub
 * @param {string} state - State parameter from callback URL
 * @returns {Promise<Object>} Auth result with access_token and user
 */
export const handleOAuthCallback = async (code, state) => {
	try {
		logInfo('Handling OAuth callback');

		const storedState = sessionStorage.getItem('oauth_state');
		if (state !== storedState) {
			throw new Error('Invalid state parameter - possible CSRF attack');
		}

		const codeVerifier = sessionStorage.getItem('code_verifier');
		if (!codeVerifier) {
			throw new Error('Missing code verifier - OAuth flow may have been interrupted');
		}

		sessionStorage.removeItem('oauth_state');
		sessionStorage.removeItem('code_verifier');

		const accessToken = await exchangeCodeForToken(code, codeVerifier);

		sessionStorage.setItem('github_token', accessToken);

		const sessionData = {
			token: accessToken,
			expiration: new Date().getTime() + (24 * 60 * 60 * 1000),
			createdAt: new Date().toISOString()
		};
		sessionStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

		const user = await getCurrentUser();

		logInfo('OAuth callback completed successfully', { username: user.login });

		return { access_token: accessToken, user };
	} catch (error) {
		logError('OAuth callback error', { error: error.message });
		throw error;
	}
};

/**
 * Check if user is authenticated
 * @returns {boolean} Whether user has a valid session
 */
export const isAuthenticated = () => {
	try {
		const sessionData = sessionStorage.getItem('gist_manager_session');
		if (!sessionData) {
			return false;
		}

		const { expiration } = JSON.parse(sessionData);
		return expiration && new Date().getTime() < expiration;
	} catch (error) {
		logError('Error checking authentication', { error: error.message });
		return false;
	}
};

/**
 * Check if session is expired
 * @returns {boolean} Whether session is expired
 */
export const isSessionExpired = () => {
	try {
		const sessionData = sessionStorage.getItem('gist_manager_session');
		if (!sessionData) {
			return true;
		}

		const { expiration } = JSON.parse(sessionData);
		return !expiration || new Date().getTime() >= expiration;
	} catch (error) {
		logError('Error checking session expiration', { error: error.message });
		return true;
	}
};

/**
 * Refresh session expiration if needed
 * @returns {Promise<boolean>} Whether session was refreshed
 */
export const refreshTokenIfNeeded = async () => {
	try {
		const sessionData = sessionStorage.getItem('gist_manager_session');
		if (!sessionData) {
			return false;
		}

		const parsed = JSON.parse(sessionData);
		const { expiration } = parsed;
		const timeUntilExpiry = expiration - new Date().getTime();

		if (timeUntilExpiry < 60 * 60 * 1000) {
			logInfo('Session refresh needed');
			const sessionUpdate = {
				...parsed,
				expiration: new Date().getTime() + (24 * 60 * 60 * 1000)
			};
			sessionStorage.setItem('gist_manager_session', JSON.stringify(sessionUpdate));
			return true;
		}

		return false;
	} catch (error) {
		logError('Error refreshing session', { error: error.message });
		return false;
	}
};

/**
 * Logout user and clear all session data
 */
export const logout = () => {
	try {
		logInfo('Logging out user');

		sessionStorage.removeItem('github_token');
		sessionStorage.removeItem('gist_manager_session');
		sessionStorage.removeItem('oauth_state');
		sessionStorage.removeItem('code_verifier');

		setAuthToken(null);

		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:logout'));
		}

		logInfo('User logged out successfully');
	} catch (error) {
		logError('Error during logout', { error: error.message });
	}
};

/**
 * Clear session data
 */
export const clearSession = () => {
	try {
		sessionStorage.removeItem('gist_manager_session');
		sessionStorage.removeItem('github_token');
		logInfo('Session cleared');
	} catch (error) {
		logError('Error clearing session', { error: error.message });
	}
};

/**
 * Save session data
 * @param {Object} sessionData - Session data to save
 */
export const saveSession = (sessionData) => {
	try {
		sessionStorage.setItem('gist_manager_session', JSON.stringify(sessionData));
		logInfo('Session saved');
	} catch (error) {
		logError('Error saving session', { error: error.message });
		throw error;
	}
};

const authService = {
	generateCodeVerifier,
	generateCodeChallenge,
	base64UrlEncode,
	generateOAuthState,
	exchangeCodeForToken,
	getCurrentUser,
	handleOAuthCallback,
	isAuthenticated,
	isSessionExpired,
	refreshTokenIfNeeded,
	logout,
	clearSession,
	saveSession
};

export default authService;
