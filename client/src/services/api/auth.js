/**
 * Authentication Service
 * Handles GitHub OAuth PKCE flow.
 * @module services/api/auth
 */

import axios from 'axios';
import { ErrorCategory, logError, logInfo, trackError } from '../../utils/logger';
import { getStoredToken } from './session';

const randomBytes = (length) => {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return array;
};

const base64UrlEncode = (buffer) =>
	btoa(String.fromCharCode(...buffer))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * @returns {string} Base64url-encoded random string (43-128 chars)
 */
export const generateCodeVerifier = () => base64UrlEncode(randomBytes(32));

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
 * Generate a secure random state parameter for OAuth CSRF protection
 * @returns {string} Random hex string
 */
export const generateOAuthState = () =>
	Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');

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
			code_verifier: codeVerifier,
		});

		if (!response.data?.access_token) {
			const errorMsg =
				response.data?.error_description || response.data?.error || 'No access token received';
			logError('Token exchange failed', { error: errorMsg });
			trackError(new Error(errorMsg), ErrorCategory.AUTHENTICATION, {
				step: 'exchangeCodeForToken',
				hasError: !!response.data?.error,
			});
			throw new Error(errorMsg);
		}

		logInfo('Successfully received access token');

		return response.data.access_token;
	} catch (error) {
		logError('GitHub token exchange error', {
			message: error.message,
			status: error.response?.status,
		});

		trackError(error, ErrorCategory.AUTHENTICATION, {
			step: 'exchangeCodeForToken',
			status: error.response?.status,
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
		const token = getStoredToken();

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
			status: error.response?.status,
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
