/**
 * Tests for GistEditor Component
 * Tests core editing functionality: loading, saving, and file management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import GistEditor from './GistEditor';
import { mockGist, mockUser } from '../test/fixtures';
import * as gistsApi from '../services/api/gists';
import { ToastProvider } from '../contexts/ToastContext';

vi.mock('../services/api/gists');
vi.mock('../services/api/sharedGists', () => ({
	isGistShared: vi.fn().mockResolvedValue(false),
	shareGist: vi.fn(),
	unshareGist: vi.fn()
}));

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom');
	return {
		...actual,
		useParams: vi.fn(() => ({})),
		useNavigate: vi.fn(() => vi.fn())
	};
});

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

const renderEditor = (props = {}) => {
	return render(
		<BrowserRouter>
			<ToastProvider>
				<GistEditor {...props} />
			</ToastProvider>
		</BrowserRouter>
	);
};

describe('GistEditor Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		useParams.mockReturnValue({});
	});

	describe('New gist mode', () => {
		it('renders form elements for creating new gist', () => {
			renderEditor();

			expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
		});

		it('shows Create Gist button for new gists', () => {
			renderEditor();

			expect(screen.getByRole('button', { name: /create gist/i })).toBeInTheDocument();
		});
	});

	describe('Edit gist mode', () => {
		beforeEach(() => {
			useParams.mockReturnValue({ id: 'test-gist-123' });
		});

		it('fetches gist data when id is provided', async () => {
			gistsApi.getGist.mockResolvedValue(mockGist);

			renderEditor();

			await waitFor(() => {
				expect(gistsApi.getGist).toHaveBeenCalledWith(
					'test-gist-123',
					'test-token',
					expect.any(Function)
				);
			});
		});

		it('displays loading state while fetching', () => {
			gistsApi.getGist.mockImplementation(() => new Promise(() => {}));

			renderEditor();

			expect(screen.getByText(/loading/i)).toBeInTheDocument();
		});

		it('shows Update Gist button for existing gists', async () => {
			gistsApi.getGist.mockResolvedValue(mockGist);

			renderEditor();

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /update gist/i })).toBeInTheDocument();
			});
		});
	});

	describe('Form submission', () => {
		it('calls createGist API on submit for new gist with content', async () => {
			gistsApi.createGist.mockResolvedValue({ ...mockGist, id: 'new-gist-id' });

			renderEditor();

			const descInput = screen.getByPlaceholderText(/description/i);
			fireEvent.change(descInput, { target: { value: 'New Gist' } });

			const editor = screen.getByPlaceholderText(/enter file content/i);
			fireEvent.change(editor, { target: { value: 'test content' } });

			const submitBtn = screen.getByRole('button', { name: /create gist/i });
			fireEvent.click(submitBtn);

			await waitFor(() => {
				expect(gistsApi.createGist).toHaveBeenCalledWith(
					expect.objectContaining({
						description: 'New Gist'
					}),
					'test-token',
					expect.any(Function),
					mockUser.id
				);
			});
		});

		it('calls updateGist API on submit for existing gist', async () => {
			useParams.mockReturnValue({ id: 'test-gist-123' });
			gistsApi.getGist.mockResolvedValue(mockGist);
			gistsApi.updateGist.mockResolvedValue(mockGist);

			renderEditor();

			await waitFor(() => {
				expect(screen.getByDisplayValue('Test Gist Description')).toBeInTheDocument();
			});

			const submitBtn = screen.getByRole('button', { name: /update gist/i });
			fireEvent.click(submitBtn);

			await waitFor(() => {
				expect(gistsApi.updateGist).toHaveBeenCalledWith(
					'test-gist-123',
					expect.any(Object),
					'test-token',
					expect.any(Function),
					mockUser.id
				);
			});
		});

		it('shows validation error when files are empty', async () => {
			renderEditor();

			const submitBtn = screen.getByRole('button', { name: /create gist/i });
			fireEvent.click(submitBtn);

			await waitFor(() => {
				expect(screen.getByText(/non-empty/i)).toBeInTheDocument();
			});

			expect(gistsApi.createGist).not.toHaveBeenCalled();
		});
	});

	describe('File management', () => {
		it('adds new file when Add File button clicked', async () => {
			renderEditor();

			const initialTabCount = screen.getAllByRole('button').filter(
				btn => btn.textContent.includes('newfile')
			).length;

			const addBtn = screen.getByRole('button', { name: /add file/i });
			fireEvent.click(addBtn);

			await waitFor(() => {
				const newTabCount = screen.getAllByRole('button').filter(
					btn => btn.textContent.includes('newfile')
				).length;
				expect(newTabCount).toBeGreaterThan(initialTabCount);
			});
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

			renderEditor();

			expect(screen.getByText(/log in/i)).toBeInTheDocument();
		});
	});
});
