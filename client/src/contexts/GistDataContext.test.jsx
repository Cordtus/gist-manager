import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GistDataProvider, useGistData } from './GistDataContext';

const mocks = vi.hoisted(() => ({
	authState: {
		loading: false,
		token: 'token-a',
		user: { id: 'user-a' },
	},
	getGistPage: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
	useAuth: () => mocks.authState,
}));

vi.mock('../services/api/gists', () => ({
	getGistPage: mocks.getGistPage,
}));

const CollectionSummary = () => {
	const { gists, isIndexing, status } = useGistData();
	return (
		<output>
			{status}:{isIndexing ? 'indexing' : 'ready'}:{gists.map((gist) => gist.id).join(',')}
		</output>
	);
};

const createDeferred = () => {
	let resolve;
	const promise = new Promise((promiseResolve) => {
		resolve = promiseResolve;
	});
	return { promise, resolve };
};

describe('GistDataProvider', () => {
	beforeEach(() => {
		mocks.getGistPage.mockReset();
		mocks.authState.loading = false;
		mocks.authState.token = 'token-a';
		mocks.authState.user = { id: 'user-a' };
	});

	it('shows the first page before indexing the remaining pages', async () => {
		let resolveSecondPage;
		const secondPage = new Promise((resolve) => {
			resolveSecondPage = resolve;
		});
		mocks.getGistPage
			.mockResolvedValueOnce({
				gists: [{ id: 'first-page-gist' }],
				hasNextPage: true,
				nextPage: 2,
			})
			.mockReturnValueOnce(secondPage);

		render(
			<GistDataProvider>
				<CollectionSummary />
			</GistDataProvider>,
		);

		await screen.findByText('ready:indexing:first-page-gist');
		resolveSecondPage({
			gists: [{ id: 'second-page-gist' }],
			hasNextPage: false,
			nextPage: null,
		});
		await waitFor(() =>
			expect(screen.getByText('ready:ready:first-page-gist,second-page-gist')).toBeInTheDocument(),
		);
		expect(mocks.getGistPage).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, perPage: 30, token: 'token-a', userId: 'user-a' }),
		);
	});

	it('does not publish a late page from a previous authenticated user', async () => {
		const firstUserPage = createDeferred();
		mocks.getGistPage.mockReturnValueOnce(firstUserPage.promise).mockResolvedValueOnce({
			gists: [{ id: 'user-b-gist' }],
			hasNextPage: false,
			nextPage: null,
			page: 1,
		});

		const view = render(
			<GistDataProvider>
				<CollectionSummary />
			</GistDataProvider>,
		);
		await vi.waitFor(() => expect(mocks.getGistPage).toHaveBeenCalledTimes(1));

		mocks.authState.token = 'token-b';
		mocks.authState.user = { id: 'user-b' };
		view.rerender(
			<GistDataProvider>
				<CollectionSummary />
			</GistDataProvider>,
		);

		await screen.findByText('ready:ready:user-b-gist');
		firstUserPage.resolve({
			gists: [{ id: 'user-a-gist' }],
			hasNextPage: false,
			nextPage: null,
			page: 1,
		});

		await vi.waitFor(() => expect(screen.queryByText(/user-a-gist/)).not.toBeInTheDocument());
	});
});
