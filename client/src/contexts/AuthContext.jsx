/**
 * Authentication Context
 * Provides authentication state and methods for GitHub OAuth PKCE flow.
 * @module contexts/AuthContext
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { setAuthToken } from '../services/api/github';
import authService from '../services/api/auth';
import { logInfo, logError, trackError, ErrorCategory } from '../utils/logger';

const AuthContext = createContext();

/**
 * Hook to access authentication context
 * @returns {Object} Auth context value
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Authentication Provider Component
 * Manages GitHub OAuth PKCE flow and user session state
 */
export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/**
	 * Clear session and log out user
	 */
	const logout = useCallback(async () => {
		try {
			setUser(null);
			setToken(null);
			setError(null);

			setAuthToken(null);

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('auth:logout'));
			}

			sessionStorage.removeItem('github_token');
			sessionStorage.removeItem('gist_manager_session');
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');

			logInfo('User logged out successfully');
		} catch (error) {
			logError('Logout error:', { error: error.message });
		}
	}, []);

	/**
	 * Fetch current user data from GitHub
	 */
	const fetchUser = useCallback(async () => {
		if (!token) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			const userData = await authService.getCurrentUser();
			setUser(userData);
			setError(null);
		} catch (error) {
			logError('Error fetching user', error);
			setError('Failed to retrieve user information');
			logout();
		} finally {
			setLoading(false);
		}
	}, [token, logout]);

	/**
	 * Check authentication status on load
	 */
	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				setLoading(true);

				// Check sessionStorage for existing token
				let savedToken = null;

				try {
					const sessionData = sessionStorage.getItem('gist_manager_session');
					if (sessionData) {
						const { token: sessionToken, expiration } = JSON.parse(sessionData);
						if (expiration && new Date().getTime() < expiration) {
							savedToken = sessionToken;
						}
					}
				} catch (e) {
					logError('Error reading session data', { error: e.message });
				}

				if (!savedToken) {
					savedToken = sessionStorage.getItem('github_token');
				}

				if (savedToken) {
					setToken(savedToken);
					setAuthToken(savedToken);
					logInfo('Found existing session token');
				}
			} catch (error) {
				logError('Error checking authentication status:', error);
			} finally {
				setLoading(false);
			}
		};

		checkAuthStatus();
	}, []);

	/**
	 * Fetch user when token changes
	 */
	useEffect(() => {
		if (token) {
			fetchUser();
		}
	}, [token, fetchUser]);

	/**
	 * Listen for token invalid events
	 */
	useEffect(() => {
		const handleTokenInvalid = () => {
			logInfo('Received token_invalid event, logging out');
			trackError(new Error('Token became invalid'), ErrorCategory.AUTHENTICATION, {
				action: 'auto_logout',
				reason: 'token_invalid_event'
			});
			logout();
		};

		window.addEventListener('auth:token_invalid', handleTokenInvalid);

		return () => {
			window.removeEventListener('auth:token_invalid', handleTokenInvalid);
		};
	}, [logout]);

	/**
	 * Initiate GitHub OAuth login with PKCE
	 * Builds authorization URL directly and redirects to GitHub
	 */
	const initiateGithubLogin = useCallback(async () => {
		try {
			const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;

			if (!clientId) {
				const errorMsg = 'GitHub OAuth is not configured. Missing REACT_APP_GITHUB_CLIENT_ID.';
				setError(errorMsg);
				logError(errorMsg);
				return;
			}

			// Generate PKCE verifier and challenge
			const codeVerifier = authService.generateCodeVerifier();
			const codeChallenge = await authService.generateCodeChallenge(codeVerifier);
			const state = authService.generateOAuthState();

			// Store verifier and state for callback
			sessionStorage.setItem('code_verifier', codeVerifier);
			sessionStorage.setItem('oauth_state', state);

			const redirectUri = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/callback`;
			const scopes = 'gist user user:email';

			// Build GitHub authorization URL with PKCE
			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				scope: scopes,
				state: state,
				code_challenge: codeChallenge,
				code_challenge_method: 'S256'
			});

			const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

			logInfo('Initiating GitHub OAuth login with PKCE', { redirectUri, scopes });

			// Redirect to GitHub
			window.location.href = authUrl;
		} catch (error) {
			logError('Error initiating GitHub login', error);
			setError(`Failed to initiate GitHub login: ${error.message}`);
		}
	}, []);

	/**
	 * Clear error message
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	/**
	 * Handle login with authorization code (called from Callback component)
	 * @param {string} code - Authorization code from GitHub
	 * @param {string} state - State parameter for CSRF verification
	 * @returns {Promise<boolean>} Success status
	 */
	const login = async (code, state) => {
		try {
			setLoading(true);
			setError(null);

			// Verify state
			const storedState = sessionStorage.getItem('oauth_state');
			if (state !== storedState) {
				throw new Error('Invalid state parameter - possible CSRF attack');
			}

			// Get code verifier
			const codeVerifier = sessionStorage.getItem('code_verifier');
			if (!codeVerifier) {
				throw new Error('Missing code verifier - OAuth flow may have been interrupted');
			}

			// Exchange code for token directly with GitHub
			const accessToken = await authService.exchangeCodeForToken(code, codeVerifier);

			// Clear OAuth flow data
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');

			// Store token
			sessionStorage.setItem('github_token', accessToken);
			const sessionData = {
				token: accessToken,
				expiration: new Date().getTime() + (24 * 60 * 60 * 1000),
				createdAt: new Date().toISOString()
			};
			sessionStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			// Set token in state and API
			setToken(accessToken);
			setAuthToken(accessToken);

			logInfo('Login successful');
			return true;
		} catch (error) {
			const errorMessage = error.message || 'Authentication failed';
			logError('Login error:', { message: errorMessage, error });
			setError(errorMessage);

			// Clear any partial OAuth state
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');

			return false;
		} finally {
			setLoading(false);
		}
	};

	const contextValue = {
		user,
		token,
		login,
		logout,
		loading,
		error,
		clearError,
		initiateGithubLogin,
		isAuthenticated: !!user
	};

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
