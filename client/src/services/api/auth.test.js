/**
 * Authentication Service Tests
 * Tests security-critical OAuth PKCE flow and token handling.
 */

import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveToken } from './session';

vi.mock('axios', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		defaults: { headers: { common: {} } },
	},
}));

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
		UNKNOWN: 'unknown',
	},
}));

const authService = await import('./auth');

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

	describe('Token Exchange', () => {
		it('throws on missing token response', async () => {
			axios.post.mockResolvedValue({ data: {} });

			await expect(authService.exchangeCodeForToken('code', 'verifier')).rejects.toThrow();
		});

		it('throws on error response', async () => {
			axios.post.mockResolvedValue({
				data: { error: 'bad_verification_code', error_description: 'The code passed is incorrect' },
			});

			await expect(authService.exchangeCodeForToken('bad_code', 'verifier')).rejects.toThrow();
		});

		it('calls local proxy endpoint and returns the token', async () => {
			axios.post.mockResolvedValue({ data: { access_token: mockToken } });

			const token = await authService.exchangeCodeForToken('test_code', 'test_verifier');

			expect(token).toBe(mockToken);
			expect(axios.post).toHaveBeenCalledWith('/api/auth/token', {
				code: 'test_code',
				code_verifier: 'test_verifier',
			});
		});
	});

	describe('User Fetching', () => {
		it('throws when no token exists', async () => {
			await expect(authService.getCurrentUser()).rejects.toThrow('No authentication token');
		});

		it('returns user data with valid token', async () => {
			saveToken(mockToken);
			axios.get.mockResolvedValue({ data: mockUser });

			const result = await authService.getCurrentUser();

			expect(result).toEqual(mockUser);
			expect(axios.get).toHaveBeenCalledWith('https://api.github.com/user', {
				headers: { Authorization: `Bearer ${mockToken}` },
			});
		});

		it('throws on 401 response', async () => {
			saveToken(mockToken);
			axios.get.mockRejectedValue({ response: { status: 401 } });

			await expect(authService.getCurrentUser()).rejects.toThrow('invalid or expired');
		});
	});
});
