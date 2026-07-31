import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
	gistData: {},
	refresh: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
	useAuth: () => ({
		initiateGithubLogin: vi.fn(),
		user: { id: 'user-a', login: 'octo' },
	}),
}));

vi.mock('../contexts/GistDataContext', () => ({
	useGistData: () => mocks.gistData,
}));

const renderDashboard = () =>
	render(
		<BrowserRouter>
			<Dashboard />
		</BrowserRouter>,
	);

describe('Dashboard', () => {
	beforeEach(() => {
		mocks.refresh.mockReset();
		mocks.gistData = {
			error: null,
			gists: [],
			isIndexing: false,
			refresh: mocks.refresh,
			status: 'ready',
		};
	});

	it('derives summary and recent gists from the shared collection', () => {
		mocks.gistData.gists = [
			{
				id: 'gist-1',
				description: 'First gist',
				files: { 'notes.md': { filename: 'notes.md' } },
				updated_at: '2026-07-31T00:00:00Z',
			},
			{
				id: 'gist-2',
				description: 'Second gist',
				files: {
					'app.js': { filename: 'app.js' },
					'config.json': { filename: 'config.json' },
				},
				updated_at: '2026-07-30T00:00:00Z',
			},
		];

		renderDashboard();

		expect(screen.getByText('Gists').parentElement).toHaveTextContent('Gists2');
		expect(screen.getByText('Files').parentElement).toHaveTextContent('Files3');
		expect(screen.getByRole('link', { name: /First gist/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Second gist/i })).toBeInTheDocument();
	});

	it('offers a retry when the shared collection cannot load', () => {
		mocks.gistData = {
			...mocks.gistData,
			error: 'Failed to load your gists. Please try again.',
			status: 'error',
		};

		renderDashboard();

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});
});
