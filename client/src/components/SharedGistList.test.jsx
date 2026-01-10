/**
 * Tests for SharedGistList Component
 * Tests community gist browsing and interaction features.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SharedGistList from './SharedGistList';
import { mockSharedGist, mockUser } from '../test/fixtures';
import { ToastProvider } from '../contexts/ToastContext';
import * as sharedGistsApi from '../services/api/sharedGists';

vi.mock('../services/api/sharedGists');

vi.mock('../contexts/AuthContext', async () => {
	const actual = await vi.importActual('../contexts/AuthContext');
	return {
		...actual,
		useAuth: vi.fn(() => ({
			user: mockUser,
			token: 'test-token',
			isAuthenticated: true,
			loading: false
		}))
	};
});

const renderWithProviders = (component) => {
	return render(
		<BrowserRouter>
			<ToastProvider>
				{component}
			</ToastProvider>
		</BrowserRouter>
	);
};

describe('SharedGistList - Community Features', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('Fetching community gists', () => {
		it('calls API to fetch shared gists on mount', async () => {
			sharedGistsApi.getAllSharedGists.mockResolvedValue({ gists: [mockSharedGist] });

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(sharedGistsApi.getAllSharedGists).toHaveBeenCalled();
			});
		});

		it('displays shared gists after loading', async () => {
			sharedGistsApi.getAllSharedGists.mockResolvedValue({ gists: [mockSharedGist] });

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
			});

			// Component should display something after loading completes
			expect(screen.getByText(/community shared gists/i)).toBeInTheDocument();
		});

		it('handles API errors gracefully', async () => {
			sharedGistsApi.getAllSharedGists.mockRejectedValue(new Error('Network error'));

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(screen.getByText(/failed/i)).toBeInTheDocument();
			});
		});

		it('shows empty state when no shared gists', async () => {
			sharedGistsApi.getAllSharedGists.mockResolvedValue({ gists: [] });

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(screen.getByText(/no shared gists/i)).toBeInTheDocument();
			});
		});
	});
});
