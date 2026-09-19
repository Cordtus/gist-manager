/**
 * Authentication Context
 * Provides authentication state and methods for GitHub OAuth PKCE flow.
 * @module contexts/AuthContext
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
	exchangeCodeForToken,
	generateCodeChallenge,
	generateCodeVerifier,
	generateOAuthState,
	getCurrentUser,
} from '../services/api/auth';
import { clearSession, getStoredToken, saveToken } from '../services/api/session';
import { ErrorCategory, logError, logInfo, trackError } from '../utils/logger';

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

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('auth:logout'));
			}

			clearSession();
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');

			logInfo('User logged out successfully');
		} catch (error) {
			logError('Logout error:', { error: error.message });
		}
	}, []);

	/**
	 * Check authentication status on load
	 */
	useEffect(() => {
		let isCurrent = true;
		const checkAuthStatus = async () => {
			try {
				setLoading(true);

				const savedToken = getStoredToken();

				if (savedToken) {
					logInfo('Found existing session token');
					const userData = await getCurrentUser();
					if (!isCurrent) return;
					setToken(savedToken);
					setUser(userData);
					setError(null);
				}
			} catch (error) {
				logError('Error checking authentication status:', error);
				if (!isCurrent) return;
				setToken(null);
				setUser(null);
				setError('Failed to retrieve user information');
				clearSession();
			} finally {
				if (isCurrent) setLoading(false);
			}
		};

		checkAuthStatus();
		return () => {
			isCurrent = false;
		};
	}, []);

	/**
	 * Listen for token invalid events
	 */
	useEffect(() => {
		const handleTokenInvalid = () => {
			logInfo('Received token_invalid event, logging out');
			trackError(new Error('Token became invalid'), ErrorCategory.AUTHENTICATION, {
				action: 'auto_logout',
				reason: 'token_invalid_event',
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
			const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

			if (!clientId) {
				const errorMsg = 'GitHub OAuth is not configured. Missing VITE_GITHUB_CLIENT_ID.';
				setError(errorMsg);
				logError(errorMsg);
				return;
			}

			// Generate PKCE verifier and challenge
			const codeVerifier = generateCodeVerifier();
			const codeChallenge = await generateCodeChallenge(codeVerifier);
			const state = generateOAuthState();

			// Store verifier and state for callback
			sessionStorage.setItem('code_verifier', codeVerifier);
			sessionStorage.setItem('oauth_state', state);

			const redirectUri = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/callback`;
			const scopes = 'gist';

			// Build GitHub authorization URL with PKCE
			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				scope: scopes,
				state: state,
				code_challenge: codeChallenge,
				code_challenge_method: 'S256',
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
	const login = useCallback(async (code, state) => {
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
			const accessToken = await exchangeCodeForToken(code, codeVerifier);

			// Clear OAuth flow data
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');

			// Store token
			saveToken(accessToken);

			// Set token in state and fetch user
			setToken(accessToken);
			const userData = await getCurrentUser();
			setUser(userData);

			logInfo('Login successful');
			return true;
		} catch (error) {
			const errorMessage = error.message || 'Authentication failed';
			logError('Login error:', { message: errorMessage, error });
			setError(errorMessage);
			setToken(null);
			setUser(null);

			// Clear any partial OAuth state
			sessionStorage.removeItem('oauth_state');
			sessionStorage.removeItem('code_verifier');
			clearSession();

			return false;
		} finally {
			setLoading(false);
		}
	}, []);

	const contextValue = {
		user,
		token,
		login,
		logout,
		loading,
		error,
		clearError,
		initiateGithubLogin,
		isAuthenticated: !!user,
	};

	return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
