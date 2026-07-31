import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	githubApi: {
		delete: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
	},
}));

vi.mock('./github', () => ({ githubApi: mocks.githubApi }));
vi.mock('../../utils/logger', () => ({
	handleApiError: vi.fn(),
	logError: vi.fn(),
	logInfo: vi.fn(),
}));

import {
	clearGistsCache,
	createGist,
	deleteGist,
	forkGist,
	getGistPage,
	getGists,
	updateGist,
} from './gists';

const createDeferred = () => {
	let resolve;
	const promise = new Promise((promiseResolve) => {
		resolve = promiseResolve;
	});

	return { promise, resolve };
};

describe('paged gist API', () => {
	beforeEach(() => {
		clearGistsCache();
		vi.clearAllMocks();
	});

	it('returns the same in-flight page to concurrent callers', async () => {
		const request = createDeferred();
		const gists = [{ id: 'gist-1' }];
		mocks.githubApi.get.mockReturnValue(request.promise);

		const firstRequest = getGistPage({ token: 'token-a', userId: 'user-a' });
		const secondRequest = getGistPage({ token: 'token-a', userId: 'user-a' });

		expect(secondRequest).toBe(firstRequest);
		await vi.waitFor(() => expect(mocks.githubApi.get).toHaveBeenCalledTimes(1));

		request.resolve({ data: gists, headers: {} });

		await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
			{
				gists,
				page: 1,
				perPage: 20,
				hasNextPage: false,
				nextPage: null,
				eTag: null,
			},
			{
				gists,
				page: 1,
				perPage: 20,
				hasNextPage: false,
				nextPage: null,
				eTag: null,
			},
		]);
	});

	it('requires both a token and a user identity for a page request', async () => {
		await expect(getGistPage({ userId: 'user-a' })).rejects.toThrow(
			'Authentication required to fetch gists',
		);
		await expect(getGistPage({ token: 'token-a' })).rejects.toThrow(
			'User ID required to fetch gists',
		);
	});

	it('shares cached pages across token refreshes for the same user', async () => {
		mocks.githubApi.get.mockResolvedValue({ data: [{ id: 'gist-1' }], headers: {} });

		const originalTokenPage = await getGistPage({ token: 'token-a', userId: 'user-a' });
		const refreshedTokenPage = await getGistPage({ token: 'token-b', userId: 'user-a' });

		expect(refreshedTokenPage).toBe(originalTokenPage);
		expect(mocks.githubApi.get).toHaveBeenCalledTimes(1);
	});

	it('reuses the cached page when a forced ETag refresh returns 304', async () => {
		const cachedGists = [{ id: 'gist-1' }];
		mocks.githubApi.get
			.mockResolvedValueOnce({
				data: cachedGists,
				headers: { etag: '"page-1"' },
			})
			.mockResolvedValueOnce({ status: 304, data: undefined, headers: {} });

		const cachedPage = await getGistPage({ token: 'token-a', userId: 'user-a' });
		const refreshedPage = await getGistPage({ token: 'token-a', userId: 'user-a', force: true });

		expect(mocks.githubApi.get).toHaveBeenLastCalledWith(
			'/gists',
			expect.objectContaining({
				headers: expect.objectContaining({ 'If-None-Match': '"page-1"' }),
			}),
		);
		expect(refreshedPage).toBe(cachedPage);
	});

	it('joins a forced refresh instead of returning a stale cached page', async () => {
		mocks.githubApi.get.mockResolvedValueOnce({
			data: [{ id: 'cached-gist' }],
			headers: { etag: '"page-1"' },
		});
		const refresh = createDeferred();
		mocks.githubApi.get.mockReturnValueOnce(refresh.promise);

		await getGistPage({ token: 'token-a', userId: 'user-a' });
		const forcedRequest = getGistPage({ token: 'token-a', userId: 'user-a', force: true });
		const normalRequest = getGistPage({ token: 'token-a', userId: 'user-a' });

		expect(normalRequest).toBe(forcedRequest);

		refresh.resolve({ data: [{ id: 'refreshed-gist' }], headers: { etag: '"page-2"' } });

		await expect(normalRequest).resolves.toMatchObject({ gists: [{ id: 'refreshed-gist' }] });
	});

	it('uses the Link next relation to expose the next page', async () => {
		const controller = new AbortController();
		mocks.githubApi.get.mockResolvedValue({
			data: [{ id: 'gist-1' }],
			headers: {
				link: '<https://api.github.com/gists?per_page=20&page=3>; rel="next"',
			},
		});

		await expect(
			getGistPage({ token: 'token-a', userId: 'user-a', page: 2, signal: controller.signal }),
		).resolves.toEqual(expect.objectContaining({ hasNextPage: true, nextPage: 3 }));

		const [, config] = mocks.githubApi.get.mock.calls[0];
		expect(config).toMatchObject({
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: 'Bearer token-a',
			},
			params: { page: 2, per_page: 20 },
			signal: controller.signal,
		});
		expect(config.validateStatus(304)).toBe(true);
		expect(config.validateStatus(404)).toBe(false);
	});

	it('lets the legacy collection helper reuse the paged cache', async () => {
		const gists = [{ id: 'gist-1' }];
		mocks.githubApi.get.mockResolvedValue({ data: gists, headers: {} });

		await getGistPage({ token: 'token-a', userId: 'user-a', perPage: 100 });
		await expect(getGists('token-a', undefined, 'user-a')).resolves.toEqual(gists);

		expect(mocks.githubApi.get).toHaveBeenCalledTimes(1);
	});

	it('fetches a user page again after creating a gist invalidates that user cache', async () => {
		mocks.githubApi.get
			.mockResolvedValueOnce({ data: [{ id: 'before-create' }], headers: {} })
			.mockResolvedValueOnce({ data: [{ id: 'after-create' }], headers: {} });
		mocks.githubApi.post.mockResolvedValue({ data: { id: 'created-gist' } });

		await getGistPage({ token: 'token-a', userId: 'user-a' });
		await createGist({ description: 'new gist', files: {} }, 'token-a', undefined, 'user-a');
		const pageAfterCreate = await getGistPage({ token: 'token-a', userId: 'user-a' });

		expect(pageAfterCreate.gists).toEqual([{ id: 'after-create' }]);
		expect(mocks.githubApi.get).toHaveBeenCalledTimes(2);
	});

	it.each([
		[
			'creates',
			() => createGist({ description: 'new gist', files: {} }, 'token-a', undefined, 'user-a'),
			() => mocks.githubApi.post.mockResolvedValue({ data: { id: 'created-gist' } }),
		],
		[
			'updates',
			() => updateGist('gist-a', { description: 'updated' }, 'token-a', undefined, 'user-a'),
			() => mocks.githubApi.patch.mockResolvedValue({ data: { id: 'gist-a' } }),
		],
		[
			'deletes',
			() => deleteGist('gist-a', 'token-a', undefined, 'user-a'),
			() => mocks.githubApi.delete.mockResolvedValue({}),
		],
		[
			'forks',
			() => forkGist('gist-a', 'token-a', undefined, 'user-a'),
			() => mocks.githubApi.post.mockResolvedValue({ data: { id: 'forked-gist' } }),
		],
	])('%s a gist and invalidates only that user’s cached pages', async (_name, mutate, mockMutation) => {
		mocks.githubApi.get
			.mockResolvedValueOnce({ data: [{ id: 'user-a-before' }], headers: {} })
			.mockResolvedValueOnce({ data: [{ id: 'user-b-cached' }], headers: {} })
			.mockResolvedValueOnce({ data: [{ id: 'user-a-after' }], headers: {} });
		mockMutation();

		await getGistPage({ token: 'token-a', userId: 'user-a' });
		const userBCachedPage = await getGistPage({ token: 'token-b', userId: 'user-b' });
		await mutate();
		const userAPageAfterMutation = await getGistPage({ token: 'token-a', userId: 'user-a' });
		const userBPageAfterMutation = await getGistPage({ token: 'token-b', userId: 'user-b' });

		expect(userAPageAfterMutation.gists).toEqual([{ id: 'user-a-after' }]);
		expect(userBPageAfterMutation).toBe(userBCachedPage);
		expect(mocks.githubApi.get).toHaveBeenCalledTimes(3);
	});
});
