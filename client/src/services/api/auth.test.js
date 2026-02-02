/**
 * Authentication Service Tests
 * Tests security-critical OAuth PKCE flow and session management.
 * Focus: State validation, PKCE flow, token handling, session security.
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

const authService = await import('./auth');
const { setAuthToken } = await import('./github');

const mockUser = { id: 12345, login: 'testuser' };
const mockToken = 'gho_test_token_12345';

describe('Authentication Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
	});

	afterEach(() => vi.restoreAllMocks());

	describe('PKCE Code Verifier Generation', () => {
		it('generates base64url-encoded verifier', () => {
			const verifier = authService.generateCodeVerifier();
			expect(verifier).toBeDefined();
			expect(verifier.length).toBeGreaterThanOrEqual(32);
			expect(/^[A-Za-z0-9_-]+$/.test(verifier)).toBe(true);
		});

		it('generates unique verifiers on each call', () => {
			const verifiers = new Set([...Array(10)].map(() => authService.generateCodeVerifier()));
			expect(verifiers.size).toBe(10);
		});
	});

	describe('PKCE Code Challenge Generation', () => {
		it('generates base64url-encoded SHA-256 challenge', async () => {
			const verifier = authService.generateCodeVerifier();
			const challenge = await authService.generateCodeChallenge(verifier);
			expect(challenge).toBeDefined();
			expect(/^[A-Za-z0-9_-]+$/.test(challenge)).toBe(true);
		});

		it('generates consistent challenge for same verifier', async () => {
			const verifier = 'test_verifier_12345';
			const challenge1 = await authService.generateCodeChallenge(verifier);
			const challenge2 = await authService.generateCodeChallenge(verifier);
			expect(challenge1).toBe(challenge2);
		});
	});

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

	describe('OAuth Flow', () => {
		it('handleOAuthCallback rejects invalid state (CSRF protection)', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');
			sessionStorage.setItem('code_verifier', 'test_verifier');

			await expect(
				authService.handleOAuthCallback('code', 'wrong_state')
			).rejects.toThrow('Invalid state parameter');
		});

		it('handleOAuthCallback rejects missing code verifier', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');

			await expect(
				authService.handleOAuthCallback('code', 'valid_state')
			).rejects.toThrow('Missing code verifier');
		});

		it('handleOAuthCallback exchanges code for token on valid state', async () => {
			sessionStorage.setItem('oauth_state', 'valid_state');
			sessionStorage.setItem('code_verifier', 'test_verifier');
			axios.post.mockResolvedValue({ data: { access_token: mockToken } });
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.handleOAuthCallback('code', 'valid_state');

			expect(result.access_token).toBe(mockToken);
			expect(sessionStorage.getItem('github_token')).toBe(mockToken);
			expect(sessionStorage.getItem('oauth_state')).toBeNull();
			expect(sessionStorage.getItem('code_verifier')).toBeNull();
		});

		it('exchangeCodeForToken throws on missing token response', async () => {
			axios.post.mockResolvedValue({ data: {} });

			await expect(
				authService.exchangeCodeForToken('code', 'verifier')
			).rejects.toThrow();
		});

		it('exchangeCodeForToken throws on error response', async () => {
			axios.post.mockResolvedValue({
				data: { error: 'bad_verification_code', error_description: 'The code passed is incorrect' }
			});

			await expect(
				authService.exchangeCodeForToken('bad_code', 'verifier')
			).rejects.toThrow();
		});

		it('exchangeCodeForToken calls local proxy endpoint', async () => {
			axios.post.mockResolvedValue({ data: { access_token: mockToken } });

			await authService.exchangeCodeForToken('test_code', 'test_verifier');

			expect(axios.post).toHaveBeenCalledWith('/api/auth/token', {
				code: 'test_code',
				code_verifier: 'test_verifier'
			});
		});
	});

	describe('Session Management', () => {
		it('isAuthenticated returns false for expired session', () => {
			sessionStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: Date.now() - 1000
			}));
			expect(authService.isAuthenticated()).toBe(false);
		});

		it('isAuthenticated returns true for valid session', () => {
			sessionStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: Date.now() + 3600000
			}));
			expect(authService.isAuthenticated()).toBe(true);
		});

		it('isSessionExpired returns true when no session exists', () => {
			expect(authService.isSessionExpired()).toBe(true);
		});

		it('isSessionExpired returns false for valid session', () => {
			sessionStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: Date.now() + 3600000
			}));
			expect(authService.isSessionExpired()).toBe(false);
		});

		it('logout clears all auth data and dispatches event', () => {
			sessionStorage.setItem('github_token', mockToken);
			sessionStorage.setItem('gist_manager_session', JSON.stringify({ token: mockToken }));
			sessionStorage.setItem('oauth_state', 'test_state');
			sessionStorage.setItem('code_verifier', 'test_verifier');
			const listener = vi.fn();
			window.addEventListener('auth:logout', listener);

			authService.logout();

			expect(sessionStorage.getItem('github_token')).toBeNull();
			expect(sessionStorage.getItem('gist_manager_session')).toBeNull();
			expect(sessionStorage.getItem('oauth_state')).toBeNull();
			expect(sessionStorage.getItem('code_verifier')).toBeNull();
			expect(setAuthToken).toHaveBeenCalledWith(null);
			expect(listener).toHaveBeenCalled();
			window.removeEventListener('auth:logout', listener);
		});

		it('refreshTokenIfNeeded extends session when near expiry', async () => {
			const nearExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
			sessionStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: nearExpiry
			}));

			const refreshed = await authService.refreshTokenIfNeeded();

			expect(refreshed).toBe(true);
			const session = JSON.parse(sessionStorage.getItem('gist_manager_session'));
			expect(session.expiration).toBeGreaterThan(nearExpiry);
		});

		it('refreshTokenIfNeeded does not extend when not near expiry', async () => {
			const farExpiry = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
			sessionStorage.setItem('gist_manager_session', JSON.stringify({
				token: mockToken,
				expiration: farExpiry
			}));

			const refreshed = await authService.refreshTokenIfNeeded();

			expect(refreshed).toBe(false);
		});
	});

	describe('User Fetching', () => {
		it('getCurrentUser throws when no token exists', async () => {
			await expect(authService.getCurrentUser()).rejects.toThrow('No authentication token');
		});

		it('getCurrentUser returns user data with valid token', async () => {
			sessionStorage.setItem('github_token', mockToken);
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.getCurrentUser();

			expect(result).toEqual(mockUser);
			expect(axios.get).toHaveBeenCalledWith('https://api.github.com/user', {
				headers: { Authorization: `Bearer ${mockToken}` }
			});
		});

		it('getCurrentUser throws on 401 response', async () => {
			sessionStorage.setItem('github_token', mockToken);
			axios.get.mockRejectedValue({ response: { status: 401 } });

			await expect(authService.getCurrentUser()).rejects.toThrow('invalid or expired');
		});
	});

	describe('Base64 URL Encoding', () => {
		it('encodes buffer to base64url format', () => {
			const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
			const encoded = authService.base64UrlEncode(buffer);
			expect(encoded).toBe('SGVsbG8');
			expect(encoded).not.toContain('+');
			expect(encoded).not.toContain('/');
			expect(encoded).not.toContain('=');
		});
	});
});
