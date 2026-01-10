/**
 * Tests for GistEditor Component
 * Tests markdown editing, preview, file management, and save operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GistEditor from './GistEditor';
import { mockGist, mockUser } from '../test/fixtures';
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

const renderWithRouter = (component) => {
	return render(
		<BrowserRouter>
			<ToastProvider>
				{component}
			</ToastProvider>
		</BrowserRouter>
	);
};

describe('GistEditor Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('Editor initialization', () => {
		it('renders editor with empty state for new gist', () => {
			renderWithRouter(<GistEditor />);

			expect(screen.getByRole('textbox')).toBeInTheDocument();
			expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
		});

		it('loads existing gist data for editing', async () => {
			gistsApi.getGist.mockResolvedValue(mockGist);

			renderWithRouter(<GistEditor gistId="test-gist-123" />);

			await waitFor(() => {
				expect(screen.getByDisplayValue('Test Gist Description')).toBeInTheDocument();
			});

			expect(gistsApi.getGist).toHaveBeenCalledWith(
				'test-gist-123',
				'test-token',
				expect.any(Function)
			);
		});

		it('shows loading state while fetching gist', () => {
			gistsApi.getGist.mockImplementation(() => new Promise(() => {}));

			renderWithRouter(<GistEditor gistId="test-gist-123" />);

			expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
		});

		it('handles fetch error gracefully', async () => {
			gistsApi.getGist.mockRejectedValue(new Error('Not found'));

			renderWithRouter(<GistEditor gistId="nonexistent" />);

			await waitFor(() => {
				expect(screen.getByText(/error|not found/i)).toBeInTheDocument();
			});
		});
	});

	describe('Editor/Preview panel functionality', () => {
		it('renders editor and preview panels in split view', async () => {
			renderWithRouter(<GistEditor />);

			expect(screen.getByRole('textbox')).toBeInTheDocument();
			expect(screen.getByTestId('preview-panel') || screen.getByText(/preview/i)).toBeInTheDocument();
		});

		it('updates preview in real-time as user types', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const editor = screen.getByRole('textbox');
			await user.type(editor, '# Hello World\n\nThis is **bold** text');

			await waitFor(() => {
				const preview = screen.getByTestId('preview-panel') || document.querySelector('.markdown-preview');
				expect(preview).toHaveTextContent('Hello World');
			});
		});
	});

	describe('File management', () => {
		it('adds a new file to the gist', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const addFileButton = screen.getByRole('button', { name: /add file/i });
			await user.click(addFileButton);

			const fileNameInput = screen.getByPlaceholderText(/file name/i);
			await user.type(fileNameInput, 'newfile.js');

			expect(screen.getByText('newfile.js')).toBeInTheDocument();
		});

		it('switches between multiple files', async () => {
			const user = userEvent.setup();
			gistsApi.getGist.mockResolvedValue(mockGist);

			renderWithRouter(<GistEditor gistId="test-gist-123" />);

			await waitFor(() => {
				expect(screen.getByText('test.js')).toBeInTheDocument();
				expect(screen.getByText('README.md')).toBeInTheDocument();
			});

			await user.click(screen.getByText('README.md'));

			await waitFor(() => {
				const editor = screen.getByRole('textbox');
				expect(editor.value).toContain('# Test Gist');
			});
		});

		it('deletes a file from the gist', async () => {
			const user = userEvent.setup();
			gistsApi.getGist.mockResolvedValue(mockGist);
			window.confirm = vi.fn(() => true);

			renderWithRouter(<GistEditor gistId="test-gist-123" />);

			await waitFor(() => {
				expect(screen.getByText('test.js')).toBeInTheDocument();
			});

			const deleteButton = screen.getAllByRole('button', { name: /delete|remove/i })[0];
			await user.click(deleteButton);

			expect(window.confirm).toHaveBeenCalled();

			await waitFor(() => {
				expect(screen.queryByText('test.js')).not.toBeInTheDocument();
			});
		});
	});

	describe('Saving gists', () => {
		it('creates a new gist', async () => {
			const user = userEvent.setup();
			gistsApi.createGist.mockResolvedValue(mockGist);

			renderWithRouter(<GistEditor />);

			const descInput = screen.getByPlaceholderText(/description/i);
			await user.type(descInput, 'New Test Gist');

			const editor = screen.getByRole('textbox');
			await user.type(editor, 'console.log("test");');

			const saveButton = screen.getByRole('button', { name: /save|create/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(gistsApi.createGist).toHaveBeenCalledWith(
					expect.objectContaining({
						description: 'New Test Gist',
						public: expect.any(Boolean),
						files: expect.any(Object)
					}),
					'test-token',
					expect.any(Function),
					mockUser.id
				);
			});
		});

		it('updates an existing gist', async () => {
			const user = userEvent.setup();
			gistsApi.getGist.mockResolvedValue(mockGist);
			gistsApi.updateGist.mockResolvedValue({ ...mockGist, description: 'Updated' });

			renderWithRouter(<GistEditor gistId="test-gist-123" />);

			await waitFor(() => {
				expect(screen.getByDisplayValue('Test Gist Description')).toBeInTheDocument();
			});

			const descInput = screen.getByDisplayValue('Test Gist Description');
			await user.clear(descInput);
			await user.type(descInput, 'Updated Description');

			const saveButton = screen.getByRole('button', { name: /save|update/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(gistsApi.updateGist).toHaveBeenCalledWith(
					'test-gist-123',
					expect.objectContaining({
						description: 'Updated Description'
					}),
					'test-token',
					expect.any(Function),
					mockUser.id
				);
			});
		});

		it('toggles gist visibility (public/private)', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const visibilityToggle = screen.getByRole('checkbox', { name: /public|private/i });
			expect(visibilityToggle).toBeChecked();

			await user.click(visibilityToggle);

			expect(visibilityToggle).not.toBeChecked();
		});

		it('shows validation errors for invalid input', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const saveButton = screen.getByRole('button', { name: /save|create/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/required|cannot be empty/i)).toBeInTheDocument();
			});

			expect(gistsApi.createGist).not.toHaveBeenCalled();
		});

		it('handles save errors gracefully', async () => {
			const user = userEvent.setup();
			gistsApi.createGist.mockRejectedValue(new Error('Network error'));

			renderWithRouter(<GistEditor />);

			const descInput = screen.getByPlaceholderText(/description/i);
			await user.type(descInput, 'Test');

			const editor = screen.getByRole('textbox');
			await user.type(editor, 'content');

			const saveButton = screen.getByRole('button', { name: /save|create/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
			});
		});
	});

	describe('Toolbar actions', () => {
		it('inserts bold markdown syntax', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const editor = screen.getByRole('textbox');
			await user.type(editor, 'text');

			editor.setSelectionRange(0, 4);

			const boldButton = screen.getByRole('button', { name: /bold/i });
			await user.click(boldButton);

			expect(editor.value).toContain('**text**');
		});

		it('inserts code block', async () => {
			const user = userEvent.setup();
			renderWithRouter(<GistEditor />);

			const codeButton = screen.getByRole('button', { name: /code/i });
			await user.click(codeButton);

			const editor = screen.getByRole('textbox');
			expect(editor.value).toContain('```');
		});
	});

	describe('Keyboard shortcuts', () => {
		it('saves gist with Ctrl+S', async () => {
			const user = userEvent.setup();
			gistsApi.createGist.mockResolvedValue(mockGist);

			renderWithRouter(<GistEditor />);

			const descInput = screen.getByPlaceholderText(/description/i);
			await user.type(descInput, 'Test');

			const editor = screen.getByRole('textbox');
			await user.type(editor, 'content');

			await user.keyboard('{Control>}s{/Control}');

			await waitFor(() => {
				expect(gistsApi.createGist).toHaveBeenCalled();
			});
		});
	});
});
