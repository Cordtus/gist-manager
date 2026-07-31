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

import { clearGistsCache, createGist, getGistPage } from './gists';

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
		expect(mocks.githubApi.get).toHaveBeenCalledTimes(1);

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
});
