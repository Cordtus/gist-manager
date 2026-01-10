/**
 * GitHub API Service Tests
 * Tests API call behavior for user gists and fork operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { mockGistList, createMockError } from '../../test/fixtures';

vi.mock('axios', () => {
	const mockInstance = {
		get: vi.fn(),
		post: vi.fn(),
		defaults: { headers: { common: {} } },
		interceptors: {
			request: { use: vi.fn(), eject: vi.fn() },
			response: { use: vi.fn(), eject: vi.fn() }
		}
	};
	return {
		default: {
			create: vi.fn(() => mockInstance),
			_instance: mockInstance,
			defaults: { headers: { common: {} } },
			interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }
		}
	};
});

const githubApi = await import('./github');

describe('GitHub API Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('getUserGists', () => {
		it('fetches gists for specified user with correct params', async () => {
			axios._instance.get.mockResolvedValue({ data: mockGistList });

			const result = await githubApi.getUserGists('testuser');

			expect(axios._instance.get).toHaveBeenCalledWith(
				'/users/testuser/gists',
				{ params: { per_page: 100 } }
			);
			expect(result).toEqual(mockGistList);
		});

		it('propagates 404 errors for nonexistent users', async () => {
			axios._instance.get.mockRejectedValue(createMockError(404, 'Not Found'));

			await expect(githubApi.getUserGists('nonexistent')).rejects.toThrow();
		});

		it('propagates rate limit errors', async () => {
			axios._instance.get.mockRejectedValue(createMockError(403, 'API rate limit exceeded'));

			await expect(githubApi.getUserGists('testuser')).rejects.toThrow();
		});
	});

	describe('forkGist', () => {
		it('forks gist and returns new gist data', async () => {
			const forkedGist = { id: 'forked-123', description: 'Forked' };
			axios._instance.post.mockResolvedValue({ data: forkedGist });

			const result = await githubApi.forkGist('original-123');

			expect(axios._instance.post).toHaveBeenCalledWith('/gists/original-123/forks');
			expect(result.id).toBe('forked-123');
		});

		it('propagates auth errors', async () => {
			axios._instance.post.mockRejectedValue(createMockError(401, 'Requires authentication'));

			await expect(githubApi.forkGist('gist-123')).rejects.toThrow();
		});
	});
});
