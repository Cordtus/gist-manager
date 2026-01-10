import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		defaults: {
			headers: {
				common: {}
			}
		}
	}
}));

// Mock github module
vi.mock('./github', () => ({
	setAuthToken: vi.fn()
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
	logInfo: vi.fn(),
	logError: vi.fn(),
	logWarning: vi.fn(),
	trackError: vi.fn(),
	ErrorCategory: {
		AUTHENTICATION: 'auth',
		API: 'api',
		NETWORK: 'network',
		UI: 'ui',
		UNKNOWN: 'unknown'
	}
}));

// Mock config
vi.mock('../../config/api', () => ({
	API_BASE_URL: 'http://localhost:3000',
	API_ENDPOINTS: {
		AUTH_GITHUB: '/api/auth/github'
	}
}));

// Import after mocking
const authService = await import('./auth');
const { setAuthToken } = await import('./github');

// Test fixtures
const mockUser = {
	id: 12345,
	login: 'testuser',
	avatar_url: 'https://avatars.githubusercontent.com/u/12345',
	name: 'Test User'
};

const mockAuthToken = 'gho_test_token_12345';

describe('Authentication Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();

		// Mock window.location
		delete window.location;
		window.location = {
			origin: 'http://localhost:3000',
			href: ''
		};

		// Mock window.crypto
		if (!window.crypto) {
			window.crypto = {
				getRandomValues: (arr) => {
					for (let i = 0; i < arr.length; i++) {
						arr[i] = Math.floor(Math.random() * 256);
					}
					return arr;
				}
			};
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('generateOAuthState', () => {
		it('generates a 64-character hex string', () => {
			const state = authService.generateOAuthState();

			// 32 bytes as hex = 64 characters
			expect(state).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(state)).toBe(true);
		});

		it('generates unique states', () => {
			const state1 = authService.generateOAuthState();
			const state2 = authService.generateOAuthState();

			expect(state1).not.toBe(state2);
		});
	});

	describe('isValidRedirectUri', () => {
		it('accepts localhost URIs', () => {
			expect(authService.isValidRedirectUri('http://localhost:3000/callback')).toBe(true);
		});

		it('rejects external URIs', () => {
			expect(authService.isValidRedirectUri('http://evil.com/steal-token')).toBe(false);
		});

		it('handles invalid URIs gracefully', () => {
			expect(authService.isValidRedirectUri('not-a-valid-uri')).toBe(false);
		});
	});

	describe('initiateGitHubLogin', () => {
		it('returns OAuth authorization URL', () => {
			process.env.REACT_APP_GITHUB_CLIENT_ID = 'test_client_id';
			process.env.REACT_APP_REDIRECT_URI = 'http://localhost:3000/callback';

			const authUrl = authService.initiateGitHubLogin();

			expect(authUrl).toContain('github.com/login/oauth/authorize');
			expect(authUrl).toContain('client_id=test_client_id');
			expect(authUrl).toContain('scope=gist%20user');
		});

		it('stores state in sessionStorage', () => {
			process.env.REACT_APP_GITHUB_CLIENT_ID = 'test_client_id';
			process.env.REACT_APP_REDIRECT_URI = 'http://localhost:3000/callback';

			authService.initiateGitHubLogin();

			const storedState = sessionStorage.getItem('oauth_state');
			expect(storedState).toBeTruthy();
			expect(storedState).toHaveLength(64);
		});

		it('accepts custom scopes', () => {
			process.env.REACT_APP_GITHUB_CLIENT_ID = 'test_client_id';
			process.env.REACT_APP_REDIRECT_URI = 'http://localhost:3000/callback';

			const authUrl = authService.initiateGitHubLogin({ scope: 'gist repo' });

			expect(authUrl).toContain('scope=gist%20repo');
		});
	});

	describe('authenticateWithGitHub', () => {
		it('exchanges code for access token', async () => {
			axios.post.mockResolvedValue({
				data: { access_token: mockAuthToken }
			});

			const token = await authService.authenticateWithGitHub('test_code', 'test_state');

			expect(token).toBe(mockAuthToken);
			expect(axios.post).toHaveBeenCalledWith(
				'http://localhost:3000/api/auth/github',
				expect.objectContaining({ code: 'test_code', state: 'test_state' })
			);
			expect(setAuthToken).toHaveBeenCalledWith(mockAuthToken);
		});

		it('throws error when no token received', async () => {
			axios.post.mockResolvedValue({ data: {} });

			await expect(
				authService.authenticateWithGitHub('test_code', 'test_state')
			).rejects.toThrow('No access token received from server');
		});

		it('handles server errors', async () => {
			axios.post.mockRejectedValue({
				response: {
					status: 401,
					data: { error: 'Invalid code' }
				}
			});

			await expect(
				authService.authenticateWithGitHub('invalid_code', 'test_state')
			).rejects.toThrow();
		});

		it('handles network errors', async () => {
			axios.post.mockRejectedValue({
				request: {},
				message: 'Network Error'
			});

			await expect(
				authService.authenticateWithGitHub('test_code', 'test_state')
			).rejects.toThrow('No response received from the server');
		});
	});

	describe('handleOAuthCallback', () => {
		beforeEach(() => {
			// Set up stored state
			sessionStorage.setItem('oauth_state', 'valid_state');
		});

		it('validates state parameter', async () => {
			await expect(
				authService.handleOAuthCallback('test_code', 'invalid_state')
			).rejects.toThrow('Invalid state parameter');
		});

		it('exchanges code and stores token on success', async () => {
			axios.post.mockResolvedValue({
				data: { access_token: mockAuthToken }
			});
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.handleOAuthCallback('test_code', 'valid_state');

			expect(result.access_token).toBe(mockAuthToken);
			expect(result.user).toEqual(mockUser);
			expect(localStorage.getItem('github_token')).toBe(mockAuthToken);
			expect(localStorage.getItem('gist_manager_session')).toBeTruthy();
		});

		it('clears state from sessionStorage after use', async () => {
			axios.post.mockResolvedValue({
				data: { access_token: mockAuthToken }
			});
			axios.get.mockResolvedValue({ data: mockUser });

			await authService.handleOAuthCallback('test_code', 'valid_state');

			expect(sessionStorage.getItem('oauth_state')).toBeNull();
		});
	});

	describe('handleOAuthCallbackWithRetry', () => {
		it('succeeds on first attempt', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');
			axios.post.mockResolvedValue({ data: { access_token: mockAuthToken } });
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.handleOAuthCallbackWithRetry('test_code', 'valid_state', 3);

			expect(result.access_token).toBe(mockAuthToken);
		});

		it('fails with invalid state', async () => {
			sessionStorage.setItem('oauth_state', 'different_state');

			await expect(
				authService.handleOAuthCallbackWithRetry('test_code', 'invalid_state', 2)
			).rejects.toThrow('Invalid state parameter');
		});
	});

	describe('handleOAuthError', () => {
		it('throws error with error details', () => {
			expect(() => {
				authService.handleOAuthError('access_denied', 'User cancelled');
			}).toThrow('OAuth error: access_denied - User cancelled');
		});
	});

	describe('getCurrentUser', () => {
		it('fetches user from GitHub API with token', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			axios.get.mockResolvedValue({ data: mockUser });

			const user = await authService.getCurrentUser();

			expect(user).toEqual(mockUser);
			expect(axios.get).toHaveBeenCalledWith(
				'https://api.github.com/user',
				expect.objectContaining({
					headers: { Authorization: `Bearer ${mockAuthToken}` }
				})
			);
		});

		it('throws when no token exists', async () => {
			await expect(authService.getCurrentUser()).rejects.toThrow(
				'No authentication token found'
			);
		});

		it('uses token from session data if available', async () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 3600000
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));
			axios.get.mockResolvedValue({ data: mockUser });

			const user = await authService.getCurrentUser();

			expect(user).toEqual(mockUser);
		});
	});

	describe('validateToken', () => {
		it('returns true for valid token', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			axios.get.mockResolvedValue({ data: mockUser });

			const isValid = await authService.validateToken();

			expect(isValid).toBe(true);
		});

		it('returns false for 401 response', async () => {
			localStorage.setItem('github_token', 'expired_token');
			axios.get.mockRejectedValue({ response: { status: 401 } });

			const isValid = await authService.validateToken();

			expect(isValid).toBe(false);
		});

		it('returns true for non-401 errors', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			axios.get.mockRejectedValue({ response: { status: 500 } });

			const isValid = await authService.validateToken();

			expect(isValid).toBe(true);
		});
	});

	describe('isAuthenticated', () => {
		it('returns true with valid session', () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 3600000
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			expect(authService.isAuthenticated()).toBe(true);
		});

		it('returns false with expired session', () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() - 1000
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			expect(authService.isAuthenticated()).toBe(false);
		});

		it('returns false with no session', () => {
			expect(authService.isAuthenticated()).toBe(false);
		});
	});

	describe('isSessionExpired', () => {
		it('returns true for expired session', () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() - 1000
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			expect(authService.isSessionExpired()).toBe(true);
		});

		it('returns false for valid session', () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 3600000
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			expect(authService.isSessionExpired()).toBe(false);
		});

		it('returns true with no session', () => {
			expect(authService.isSessionExpired()).toBe(true);
		});
	});

	describe('refreshTokenIfNeeded', () => {
		it('extends session when expiring soon', async () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 300000 // 5 minutes from now
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			const refreshed = await authService.refreshTokenIfNeeded();

			expect(refreshed).toBe(true);
			const newSession = JSON.parse(localStorage.getItem('gist_manager_session'));
			expect(newSession.expiration).toBeGreaterThan(sessionData.expiration);
		});

		it('does not refresh when session has plenty of time', async () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 3600000 // 1 hour from now
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			const refreshed = await authService.refreshTokenIfNeeded();

			expect(refreshed).toBe(false);
		});

		it('returns false with no session', async () => {
			const refreshed = await authService.refreshTokenIfNeeded();
			expect(refreshed).toBe(false);
		});
	});

	describe('logout', () => {
		it('clears all auth data', () => {
			localStorage.setItem('github_token', mockAuthToken);
			localStorage.setItem('gist_manager_session', JSON.stringify({ token: mockAuthToken }));
			sessionStorage.setItem('oauth_state', 'some_state');

			authService.logout();

			expect(localStorage.getItem('github_token')).toBeNull();
			expect(localStorage.getItem('gist_manager_session')).toBeNull();
			expect(setAuthToken).toHaveBeenCalledWith(null);
		});

		it('dispatches logout event', () => {
			const eventListener = vi.fn();
			window.addEventListener('auth:logout', eventListener);

			authService.logout();

			expect(eventListener).toHaveBeenCalled();
			window.removeEventListener('auth:logout', eventListener);
		});
	});

	describe('clearSession', () => {
		it('clears session data', () => {
			localStorage.setItem('gist_manager_session', JSON.stringify({ token: mockAuthToken }));
			sessionStorage.setItem('oauth_state', 'some_state');

			authService.clearSession();

			expect(localStorage.getItem('gist_manager_session')).toBeNull();
		});
	});

	describe('saveSession', () => {
		it('saves session to localStorage', () => {
			const sessionData = {
				token: mockAuthToken,
				expiration: Date.now() + 3600000
			};

			authService.saveSession(sessionData);

			const stored = JSON.parse(localStorage.getItem('gist_manager_session'));
			expect(stored.token).toBe(mockAuthToken);
		});
	});

	describe('hasRequiredScopes', () => {
		it('returns true when scopes match', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			const sessionData = {
				token: mockAuthToken,
				scopes: ['gist', 'user']
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			const hasScopes = await authService.hasRequiredScopes(['gist']);

			expect(hasScopes).toBe(true);
		});

		it('returns false when missing scopes', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			const sessionData = {
				token: mockAuthToken,
				scopes: ['user']
			};
			localStorage.setItem('gist_manager_session', JSON.stringify(sessionData));

			const hasScopes = await authService.hasRequiredScopes(['gist', 'repo']);

			expect(hasScopes).toBe(false);
		});

		it('returns false when no token', async () => {
			const hasScopes = await authService.hasRequiredScopes(['gist']);
			expect(hasScopes).toBe(false);
		});

		it('returns true when scope info not available', async () => {
			localStorage.setItem('github_token', mockAuthToken);
			localStorage.setItem('gist_manager_session', JSON.stringify({ token: mockAuthToken }));

			const hasScopes = await authService.hasRequiredScopes(['gist']);

			expect(hasScopes).toBe(true);
		});
	});

	describe('getRateLimitStatus', () => {
		it('fetches rate limit from GitHub API', async () => {
			const rateData = {
				rate: {
					limit: 5000,
					remaining: 4999,
					reset: Math.floor(Date.now() / 1000) + 3600
				}
			};
			axios.get.mockResolvedValue({ data: rateData });

			const result = await authService.getRateLimitStatus();

			expect(result).toEqual(rateData.rate);
			expect(axios.get).toHaveBeenCalledWith(
				'https://api.github.com/rate_limit',
				expect.any(Object)
			);
		});
	});

	describe('makeAuthenticatedRequest', () => {
		it('executes request function', async () => {
			const rateData = {
				rate: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 }
			};
			axios.get.mockResolvedValue({ data: rateData });

			const requestFn = vi.fn().mockResolvedValue('result');
			const result = await authService.makeAuthenticatedRequest(requestFn);

			expect(result).toBe('result');
			expect(requestFn).toHaveBeenCalled();
		});

		it('throws when rate limit exceeded', async () => {
			const rateData = {
				rate: { limit: 5000, remaining: 0, reset: Math.floor(Date.now() / 1000) + 3600 }
			};
			axios.get.mockResolvedValue({ data: rateData });

			const requestFn = vi.fn();

			await expect(
				authService.makeAuthenticatedRequest(requestFn)
			).rejects.toThrow('Rate limit exceeded');

			expect(requestFn).not.toHaveBeenCalled();
		});
	});
});
