/**
 * Tests for SharedGistList Component
 * Tests community gist browsing and interaction features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SharedGistList from './SharedGistList';
import { mockSharedGist, mockUser } from '../test/fixtures';
import { ToastProvider } from '../contexts/ToastContext';
import * as sharedGistsApi from '../services/api/sharedGists';

// Mock the shared gists API module
vi.mock('../services/api/sharedGists');

// Mock the auth context
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
			sharedGistsApi.getAllSharedGists.mockResolvedValue([mockSharedGist]);

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(sharedGistsApi.getAllSharedGists).toHaveBeenCalled();
			});
		});

		it('handles API errors gracefully', async () => {
			sharedGistsApi.getAllSharedGists.mockRejectedValue(new Error('Network error'));

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(sharedGistsApi.getAllSharedGists).toHaveBeenCalled();
			});
		});

		it('renders component without crashing', async () => {
			sharedGistsApi.getAllSharedGists.mockResolvedValue([]);

			renderWithProviders(<SharedGistList />);

			await waitFor(() => {
				expect(sharedGistsApi.getAllSharedGists).toHaveBeenCalled();
			});
		});
	});
});
