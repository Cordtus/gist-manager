import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockGistList } from '../test/fixtures';
import GistList from './GistList';

const mocks = vi.hoisted(() => ({
	gistData: {},
	refresh: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
	useAuth: () => ({
		token: 'test-token',
		user: { id: 123, login: 'testuser' },
	}),
}));

vi.mock('../contexts/GistDataContext', () => ({
	useGistData: () => mocks.gistData,
}));

vi.mock('../services/api/gists', () => ({
	deleteGist: vi.fn(),
	getGists: vi.fn(() => Promise.resolve([])),
	updateGist: vi.fn(),
}));

const renderList = () =>
	render(
		<BrowserRouter>
			<GistList />
		</BrowserRouter>,
	);

describe('GistList', () => {
	beforeEach(() => {
		mocks.refresh.mockReset();
		mocks.gistData = {
			error: null,
			gists: mockGistList,
			isIndexing: false,
			refresh: mocks.refresh,
			removeGist: vi.fn(),
			status: 'ready',
			upsertGist: vi.fn(),
		};
	});

	it('narrows visible gist cards and result count when a user searches', () => {
		renderList();

		fireEvent.change(screen.getByPlaceholderText(/search gists/i), {
			target: { value: 'another' },
		});

		expect(screen.getByText('Showing 1 of 3 gists')).toBeInTheDocument();
		expect(screen.getAllByText('Another Test Gist').length).toBeGreaterThan(0);
		expect(screen.queryByText('Test Gist Description')).not.toBeInTheDocument();
	});

	it('keeps existing cards visible while a refresh is underway', () => {
		mocks.gistData = { ...mocks.gistData, status: 'refreshing' };

		renderList();

		expect(screen.getByText('Refreshing…')).toBeInTheDocument();
		expect(screen.getAllByText('Test Gist Description').length).toBeGreaterThan(0);
	});

	it('offers retry after an initial collection-load error', () => {
		mocks.gistData = {
			...mocks.gistData,
			error: 'Failed to load your gists. Please try again.',
			gists: [],
			status: 'error',
		};

		renderList();

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});

	it('does not claim the collection is empty before the first request settles', () => {
		mocks.gistData = { ...mocks.gistData, gists: [], status: 'loading' };

		renderList();

		expect(screen.getByText(/loading your gists/i)).toBeInTheDocument();
		expect(screen.queryByText('No gists yet')).not.toBeInTheDocument();
	});
});
