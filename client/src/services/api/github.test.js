/**
 * Tests for GitHub API Service
 * Tests core axios instances and utility functions
 * For gist CRUD tests, see gists.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { mockGistList, createMockError } from '../../test/fixtures';

// Mock axios with proper interceptors structure
vi.mock('axios', () => {
	const mockAxiosInstance = {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
		defaults: {
			headers: {
				common: {}
			}
		},
		interceptors: {
			request: {
				use: vi.fn((successHandler, errorHandler) => {
					return 0;
				}),
				eject: vi.fn()
			},
			response: {
				use: vi.fn((successHandler, errorHandler) => {
					return 0;
				}),
				eject: vi.fn()
			}
		}
	};

	const mockAxios = {
		create: vi.fn(() => mockAxiosInstance),
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
		defaults: {
			headers: {
				common: {}
			}
		},
		interceptors: {
			request: { use: vi.fn(), eject: vi.fn() },
			response: { use: vi.fn(), eject: vi.fn() }
		}
	};

	// Store reference to instance for tests
	mockAxios._instance = mockAxiosInstance;

	return { default: mockAxios };
});

// Import after mocking
const githubApi = await import('./github');

describe('GitHub API Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('setAuthToken', () => {
		it('sets auth token for axios requests', () => {
			const token = 'test-token';
			githubApi.setAuthToken(token);

			// The function sets headers on both api and githubApi instances
			// Since we're testing the function's behavior, we verify it doesn't throw
			expect(() => githubApi.setAuthToken(token)).not.toThrow();
		});

		it('clears auth token when token is null', () => {
			githubApi.setAuthToken(null);

			expect(() => githubApi.setAuthToken(null)).not.toThrow();
		});
	});

	describe('getUserGists', () => {
		it('fetches gists for a specific user', async () => {
			const mockResponse = { data: mockGistList };
			axios._instance.get.mockResolvedValue(mockResponse);

			const result = await githubApi.getUserGists('testuser');

			expect(axios._instance.get).toHaveBeenCalledWith(
				'/users/testuser/gists',
				{ params: { per_page: 100 } }
			);
			expect(result).toEqual(mockGistList);
		});

		it('accepts custom options', async () => {
			const mockResponse = { data: mockGistList };
			axios._instance.get.mockResolvedValue(mockResponse);

			await githubApi.getUserGists('testuser', { per_page: 50, page: 2 });

			expect(axios._instance.get).toHaveBeenCalledWith(
				'/users/testuser/gists',
				{ params: { per_page: 50, page: 2 } }
			);
		});

		it('throws error when user not found', async () => {
			axios._instance.get.mockRejectedValue(createMockError(404, 'Not Found'));

			await expect(githubApi.getUserGists('nonexistent')).rejects.toThrow();
		});

		it('handles API rate limiting', async () => {
			axios._instance.get.mockRejectedValue(createMockError(403, 'API rate limit exceeded'));

			await expect(githubApi.getUserGists('testuser')).rejects.toThrow();
		});
	});

	describe('forkGist', () => {
		it('forks a gist successfully', async () => {
			const forkedGist = { id: 'forked-gist-123', description: 'Forked gist' };
			axios._instance.post.mockResolvedValue({ data: forkedGist });

			const result = await githubApi.forkGist('test-gist-123');

			expect(axios._instance.post).toHaveBeenCalledWith('/gists/test-gist-123/forks');
			expect(result.id).toBe('forked-gist-123');
		});

		it('throws error on authentication failure', async () => {
			axios._instance.post.mockRejectedValue(createMockError(401, 'Requires authentication'));

			await expect(githubApi.forkGist('test-gist-123')).rejects.toThrow();
		});

		it('throws error when gist not found', async () => {
			axios._instance.post.mockRejectedValue(createMockError(404, 'Not Found'));

			await expect(githubApi.forkGist('nonexistent')).rejects.toThrow();
		});
	});

	describe('Error handling', () => {
		it('handles network errors gracefully', async () => {
			const networkError = new Error('Network Error');
			networkError.code = 'ECONNREFUSED';
			axios._instance.get.mockRejectedValue(networkError);

			await expect(githubApi.getUserGists('testuser')).rejects.toThrow('Network Error');
		});

		it('handles timeout errors', async () => {
			const timeoutError = new Error('timeout of 10000ms exceeded');
			timeoutError.code = 'ECONNABORTED';
			axios._instance.post.mockRejectedValue(timeoutError);

			await expect(githubApi.forkGist('test-gist-123')).rejects.toThrow();
		});
	});

	describe('Default export', () => {
		it('exports all required functions', () => {
			expect(githubApi.default).toBeDefined();
			expect(githubApi.default.api).toBeDefined();
			expect(githubApi.default.githubApi).toBeDefined();
			expect(githubApi.default.setAuthToken).toBeDefined();
			expect(githubApi.default.getUserGists).toBeDefined();
			expect(githubApi.default.forkGist).toBeDefined();
		});
	});
});
