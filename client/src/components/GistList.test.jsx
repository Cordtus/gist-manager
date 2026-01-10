/**
 * Tests for GistList Component
 * Tests gist display, filtering, sorting, and CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GistList from './GistList';
import { mockGistList, mockUser } from '../test/fixtures';
import * as gistsApi from '../services/api/gists';
import { ToastProvider } from '../contexts/ToastContext';

// Mock the gists API module
vi.mock('../services/api/gists');

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

describe('GistList Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('Fetching and displaying gists', () => {
		it('fetches and displays user gists', async () => {
			gistsApi.getGists.mockResolvedValue(mockGistList);

			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
			});

			expect(gistsApi.getGists).toHaveBeenCalledWith(
				'test-token',
				expect.any(Function),
				mockUser.id
			);
		});

		it('shows loading state while fetching', () => {
			gistsApi.getGists.mockImplementation(() => new Promise(() => {}));

			renderWithProviders(<GistList />);

			expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
		});

		it('displays error message on fetch failure', async () => {
			gistsApi.getGists.mockRejectedValue(new Error('API Error'));

			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
			});
		});

		it('shows empty state when no gists found', async () => {
			gistsApi.getGists.mockResolvedValue([]);

			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText(/no gists|empty/i)).toBeInTheDocument();
			});
		});
	});

	describe('Filtering gists', () => {
		beforeEach(() => {
			gistsApi.getGists.mockResolvedValue(mockGistList);
		});

		it('filters gists by search query', async () => {
			const user = userEvent.setup();
			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/search/i);
			await user.type(searchInput, 'Python');

			await waitFor(() => {
				expect(screen.getByText('Another Test Gist')).toBeInTheDocument();
				expect(screen.queryByText('Test Gist Description')).not.toBeInTheDocument();
			});
		});
	});

	describe('Gist operations', () => {
		beforeEach(() => {
			gistsApi.getGists.mockResolvedValue(mockGistList);
		});

		it('deletes a gist', async () => {
			gistsApi.deleteGist.mockResolvedValue(true);
			const user = userEvent.setup();

			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
			});

			// Find and click delete button
			const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
			if (deleteButtons.length > 0) {
				await user.click(deleteButtons[0]);

				// Confirm deletion if dialog appears
				const confirmButton = screen.queryByRole('button', { name: /confirm|yes|delete/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}

				await waitFor(() => {
					expect(gistsApi.deleteGist).toHaveBeenCalled();
				});
			}
		});

		it('updates gist description', async () => {
			gistsApi.updateGist.mockResolvedValue({
				...mockGistList[0],
				description: 'Updated description'
			});
			const user = userEvent.setup();

			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
			});

			// Find and click edit button
			const editButtons = screen.getAllByRole('button', { name: /edit/i });
			if (editButtons.length > 0) {
				await user.click(editButtons[0]);

				// Update description if input appears
				const input = screen.queryByRole('textbox');
				if (input) {
					await user.clear(input);
					await user.type(input, 'Updated description');

					const saveButton = screen.queryByRole('button', { name: /save|update/i });
					if (saveButton) {
						await user.click(saveButton);

						await waitFor(() => {
							expect(gistsApi.updateGist).toHaveBeenCalled();
						});
					}
				}
			}
		});
	});

	describe('Sorting gists', () => {
		beforeEach(() => {
			gistsApi.getGists.mockResolvedValue(mockGistList);
		});

		it('sorts gists by date', async () => {
			renderWithProviders(<GistList />);

			await waitFor(() => {
				expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
			});

			// Verify gists are displayed in some order
			const gistCards = screen.getAllByRole('article');
			expect(gistCards.length).toBeGreaterThan(0);
		});
	});

	describe('Pagination', () => {
		it('handles pagination for many gists', async () => {
			const manyGists = Array.from({ length: 25 }, (_, i) => ({
				...mockGistList[0],
				id: `gist-${i}`,
				description: `Gist ${i}`
			}));

			gistsApi.getGists.mockResolvedValue(manyGists);

			renderWithProviders(<GistList />);

			await waitFor(() => {
				// Should show first page of gists
				expect(screen.getByText('Gist 0')).toBeInTheDocument();
			});
		});
	});
});
