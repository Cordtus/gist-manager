/**
 * Tests for GistList Component
 * Tests gist fetching, filtering, and CRUD operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GistList from './GistList';
import { mockGistList, mockUser } from '../test/fixtures';
import * as gistsApi from '../services/api/gists';
import { ToastProvider } from '../contexts/ToastContext';

vi.mock('../services/api/gists');

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

const renderList = () => {
	return render(
		<BrowserRouter>
			<ToastProvider>
				<GistList />
			</ToastProvider>
		</BrowserRouter>
	);
};

describe('GistList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('Fetching gists', () => {
		it('calls getGists API on mount', async () => {
			gistsApi.getGists.mockResolvedValue(mockGistList);

			renderList();

			await waitFor(() => {
				expect(gistsApi.getGists).toHaveBeenCalledWith(
					'test-token',
					expect.any(Function),
					mockUser.id
				);
			});
		});

		it('displays gist descriptions after loading', async () => {
			gistsApi.getGists.mockResolvedValue(mockGistList);

			renderList();

			await waitFor(() => {
				// Use getAllByText since description appears in multiple places
				const matches = screen.getAllByText('Test Gist Description');
				expect(matches.length).toBeGreaterThan(0);
			});
		});

		it('shows loading indicator initially', () => {
			gistsApi.getGists.mockImplementation(() => new Promise(() => {}));

			renderList();

			expect(screen.getByText(/loading/i)).toBeInTheDocument();
		});

		it('displays error message on fetch failure', async () => {
			gistsApi.getGists.mockRejectedValue(new Error('API Error'));

			renderList();

			await waitFor(() => {
				expect(screen.getByText(/failed/i)).toBeInTheDocument();
			});
		});

		it('shows empty state when no gists exist', async () => {
			gistsApi.getGists.mockResolvedValue([]);

			renderList();

			await waitFor(() => {
				expect(screen.getByText(/no gists/i)).toBeInTheDocument();
			});
		});
	});

	describe('Search functionality', () => {
		beforeEach(() => {
			gistsApi.getGists.mockResolvedValue(mockGistList);
		});

		it('has search input', async () => {
			renderList();

			await waitFor(() => {
				const matches = screen.getAllByText('Test Gist Description');
				expect(matches.length).toBeGreaterThan(0);
			});

			const searchInput = screen.getByPlaceholderText(/search/i);
			expect(searchInput).toBeInTheDocument();
		});
	});

	describe('Unauthenticated state', () => {
		it('shows login prompt when user is not authenticated', async () => {
			const { useAuth } = await import('../contexts/AuthContext');
			useAuth.mockReturnValue({
				user: null,
				token: null,
				isAuthenticated: false,
				loading: false
			});

			renderList();

			expect(screen.getByText(/log in/i)).toBeInTheDocument();
		});
	});
});
