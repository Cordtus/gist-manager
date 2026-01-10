/**
 * Authentication Service Tests
 * Tests security-critical OAuth flow and session management.
 * Focus: State validation, token handling, session security.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		defaults: { headers: { common: {} } }
	}
}));

vi.mock('./github', () => ({ setAuthToken: vi.fn() }));
vi.mock('../../utils/logger', () => ({
	logInfo: vi.fn(),
	logError: vi.fn(),
	logWarning: vi.fn(),
	trackError: vi.fn(),
	ErrorCategory: { AUTHENTICATION: 'auth', API: 'api', NETWORK: 'network', UI: 'ui', UNKNOWN: 'unknown' }
}));
vi.mock('../../config/api', () => ({
	API_BASE_URL: 'http://localhost:3000',
	API_ENDPOINTS: { AUTH_GITHUB: '/api/auth/github' }
}));

const authService = await import('./auth');
const { setAuthToken } = await import('./github');

const mockUser = { id: 12345, login: 'testuser' };
const mockToken = 'gho_test_token_12345';

describe('Authentication Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		sessionStorage.clear();
	});

	afterEach(() => vi.restoreAllMocks());

	describe('OAuth State Security', () => {
		it('generates 64-char hex state', () => {
			const state = authService.generateOAuthState();
			expect(state).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(state)).toBe(true);
		});

		it('generates unique states on each call', () => {
			const states = new Set([...Array(10)].map(() => authService.generateOAuthState()));
			expect(states.size).toBe(10);
		});
	});

	describe('Redirect URI Validation (Open Redirect Prevention)', () => {
		it('accepts localhost URIs', () => {
			expect(authService.isValidRedirectUri('http://localhost:3000/callback')).toBe(true);
		});

		it('rejects external URIs', () => {
			expect(authService.isValidRedirectUri('http://evil.com/steal-token')).toBe(false);
		});

		it('rejects malformed URIs', () => {
			expect(authService.isValidRedirectUri('javascript:alert(1)')).toBe(false);
		});
	});

	describe('OAuth Flow', () => {
		it('handleOAuthCallback rejects invalid state (CSRF protection)', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');

			await expect(
				authService.handleOAuthCallback('code', 'wrong_state')
			).rejects.toThrow('Invalid state parameter');
		});

		it('handleOAuthCallback exchanges code for token on valid state', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');
			axios.post.mockResolvedValue({ data: { access_token: mockToken } });
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.handleOAuthCallback('code', 'valid_state');

			expect(result.access_token).toBe(mockToken);
			expect(localStorage.getItem('github_token')).toBe(mockToken);
			expect(sessionStorage.getItem('oauth_state')).toBeNull();
		});

		it('authenticateWithGitHub throws on missing token response', async () => {
			axios.post.mockResolvedValue({ data: {} });

			await expect(
				authService.authenticateWithGitHub('code', 'state')
			).rejects.toThrow('No access token received');
		});
	});

	describe('Session Management', () => {
		it('isAuthenticated returns false for expired session', () => {
			localStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: Date.now() - 1000
			}));
			expect(authService.isAuthenticated()).toBe(false);
		});

		it('isAuthenticated returns true for valid session', () => {
			localStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: Date.now() + 3600000
			}));
			expect(authService.isAuthenticated()).toBe(true);
		});

		it('logout clears all auth data and dispatches event', () => {
			localStorage.setItem('github_token', mockToken);
			localStorage.setItem('gist_manager_session', JSON.stringify({ token: mockToken }));
			const listener = vi.fn();
			window.addEventListener('auth:logout', listener);

			authService.logout();

			expect(localStorage.getItem('github_token')).toBeNull();
			expect(localStorage.getItem('gist_manager_session')).toBeNull();
			expect(setAuthToken).toHaveBeenCalledWith(null);
			expect(listener).toHaveBeenCalled();
			window.removeEventListener('auth:logout', listener);
		});
	});

	describe('Token Validation', () => {
		it('validateToken returns true for valid token', async () => {
			localStorage.setItem('github_token', mockToken);
			axios.get.mockResolvedValue({ data: mockUser });

			expect(await authService.validateToken()).toBe(true);
		});

		it('validateToken returns false for 401 response', async () => {
			localStorage.setItem('github_token', 'expired');
			axios.get.mockRejectedValue({ response: { status: 401 } });

			expect(await authService.validateToken()).toBe(false);
		});

		it('getCurrentUser throws when no token exists', async () => {
			await expect(authService.getCurrentUser()).rejects.toThrow('No authentication token');
		});
	});

	describe('Rate Limiting', () => {
		it('makeAuthenticatedRequest blocks when rate limit exceeded', async () => {
			axios.get.mockResolvedValue({
				data: { rate: { limit: 5000, remaining: 0, reset: Date.now() / 1000 + 3600 } }
			});

			await expect(
				authService.makeAuthenticatedRequest(() => {})
			).rejects.toThrow('Rate limit exceeded');
		});
	});
});
