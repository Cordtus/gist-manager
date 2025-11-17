import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GistEditor from './GistEditor';
import { mockGist } from '../test/fixtures';
import * as githubApi from '../services/api/github';

vi.mock('../services/api/github');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
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
      githubApi.getGist.mockResolvedValue(mockGist);

      renderWithRouter(<GistEditor gistId="test-gist-123" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Gist Description')).toBeInTheDocument();
      });

      expect(githubApi.getGist).toHaveBeenCalledWith('test-gist-123');
    });

    it('shows loading state while fetching gist', () => {
      githubApi.getGist.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<GistEditor gistId="test-gist-123" />);

      expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('handles fetch error gracefully', async () => {
      githubApi.getGist.mockRejectedValue(new Error('Not found'));

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

    it('toggles between editor, preview, and split view modes', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      // Switch to preview-only mode
      const previewButton = screen.getByRole('button', { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeVisible();
      });

      // Switch to editor-only mode
      const editorButton = screen.getByRole('button', { name: /edit|editor/i });
      await user.click(editorButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeVisible();
      });

      // Switch to split mode
      const splitButton = screen.getByRole('button', { name: /split/i });
      await user.click(splitButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeVisible();
        expect(screen.getByTestId('preview-panel') || screen.getByText(/preview/i)).toBeInTheDocument();
      });
    });

    it('updates preview in real-time as user types', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const editor = screen.getByRole('textbox');
      await user.type(editor, '# Hello World\n\nThis is **bold** text');

      await waitFor(() => {
        const preview = screen.getByTestId('preview-panel') || document.querySelector('.markdown-preview');
        expect(preview).toHaveTextContent('Hello World');
        expect(preview).toHaveTextContent('This is bold text');
      });
    });

    it('renders markdown correctly in preview', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const markdownContent = `
# Heading 1
## Heading 2

- List item 1
- List item 2

\`\`\`javascript
console.log("code block");
\`\`\`

**Bold** and *italic* text
      `;

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, markdownContent);

      await waitFor(() => {
        const preview = screen.getByTestId('preview-panel') || document.querySelector('.markdown-preview');
        expect(preview.querySelector('h1')).toHaveTextContent('Heading 1');
        expect(preview.querySelector('h2')).toHaveTextContent('Heading 2');
        expect(preview.querySelectorAll('li')).toHaveLength(2);
        expect(preview.querySelector('code')).toBeInTheDocument();
      });
    });

    it('supports syntax highlighting in code blocks', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const codeContent = '```javascript\nconst x = 10;\nconsole.log(x);\n```';
      const editor = screen.getByRole('textbox');
      await user.type(editor, codeContent);

      await waitFor(() => {
        const preview = document.querySelector('.markdown-preview');
        expect(preview.querySelector('pre')).toBeInTheDocument();
        expect(preview.querySelector('code.language-javascript')).toBeInTheDocument();
      });
    });

    it('resizes panels when dragging resize handle', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const resizeHandle = screen.getByTestId('resize-handle') || document.querySelector('[data-panel-resize-handle-id]');
      expect(resizeHandle).toBeInTheDocument();

      // Simulate drag to resize
      await user.pointer([
        { target: resizeHandle, keys: '[MouseLeft>]' },
        { coords: { x: 100, y: 0 } },
        { keys: '[/MouseLeft]' }
      ]);

      // Verify panels resized
      const panels = document.querySelectorAll('[data-panel-id]');
      expect(panels).toHaveLength(2);
    });

    it('synchronizes scroll between editor and preview', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const longContent = Array.from({ length: 100 }, (_, i) => `Line ${i}\n`).join('');
      const editor = screen.getByRole('textbox');
      await user.type(editor, longContent);

      // Scroll editor
      editor.scrollTop = 500;
      editor.dispatchEvent(new Event('scroll'));

      await waitFor(() => {
        const preview = document.querySelector('.markdown-preview');
        expect(preview.scrollTop).toBeGreaterThan(0);
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
      githubApi.getGist.mockResolvedValue(mockGist);

      renderWithRouter(<GistEditor gistId="test-gist-123" />);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
        expect(screen.getByText('README.md')).toBeInTheDocument();
      });

      // Click on README.md tab
      await user.click(screen.getByText('README.md'));

      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor.value).toContain('# Test Gist');
      });
    });

    it('deletes a file from the gist', async () => {
      const user = userEvent.setup();
      githubApi.getGist.mockResolvedValue(mockGist);
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

    it('renames a file', async () => {
      const user = userEvent.setup();
      githubApi.getGist.mockResolvedValue(mockGist);

      renderWithRouter(<GistEditor gistId="test-gist-123" />);

      await waitFor(() => {
        expect(screen.getByText('test.js')).toBeInTheDocument();
      });

      const renameButton = screen.getAllByRole('button', { name: /rename/i })[0];
      await user.click(renameButton);

      const input = screen.getByDisplayValue('test.js');
      await user.clear(input);
      await user.type(input, 'renamed.js');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('renamed.js')).toBeInTheDocument();
        expect(screen.queryByText('test.js')).not.toBeInTheDocument();
      });
    });
  });

  describe('Saving gists', () => {
    it('creates a new gist', async () => {
      const user = userEvent.setup();
      githubApi.createGist.mockResolvedValue(mockGist);

      renderWithRouter(<GistEditor />);

      // Fill in description
      const descInput = screen.getByPlaceholderText(/description/i);
      await user.type(descInput, 'New Test Gist');

      // Add content
      const editor = screen.getByRole('textbox');
      await user.type(editor, 'console.log("test");');

      // Save
      const saveButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(githubApi.createGist).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'New Test Gist',
            public: expect.any(Boolean),
            files: expect.any(Object)
          })
        );
      });

      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });

    it('updates an existing gist', async () => {
      const user = userEvent.setup();
      githubApi.getGist.mockResolvedValue(mockGist);
      githubApi.updateGist.mockResolvedValue({ ...mockGist, description: 'Updated' });

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
        expect(githubApi.updateGist).toHaveBeenCalledWith(
          'test-gist-123',
          expect.objectContaining({
            description: 'Updated Description'
          })
        );
      });
    });

    it('toggles gist visibility (public/private)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const visibilityToggle = screen.getByRole('checkbox', { name: /public|private/i });
      expect(visibilityToggle).toBeChecked(); // Default to public

      await user.click(visibilityToggle);

      expect(visibilityToggle).not.toBeChecked(); // Now private
    });

    it('shows validation errors for invalid input', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      // Try to save without content
      const saveButton = screen.getByRole('button', { name: /save|create/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/required|cannot be empty/i)).toBeInTheDocument();
      });

      expect(githubApi.createGist).not.toHaveBeenCalled();
    });

    it('handles save errors gracefully', async () => {
      const user = userEvent.setup();
      githubApi.createGist.mockRejectedValue(new Error('Network error'));

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

    it('prevents navigation with unsaved changes', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);

      renderWithRouter(<GistEditor />);

      const editor = screen.getByRole('textbox');
      await user.type(editor, 'unsaved content');

      // Try to navigate away
      window.dispatchEvent(new Event('beforeunload'));

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Toolbar actions', () => {
    it('inserts bold markdown syntax', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const editor = screen.getByRole('textbox');
      await user.type(editor, 'text');

      // Select text
      editor.setSelectionRange(0, 4);

      const boldButton = screen.getByRole('button', { name: /bold/i });
      await user.click(boldButton);

      expect(editor.value).toContain('**text**');
    });

    it('inserts italic markdown syntax', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const editor = screen.getByRole('textbox');
      await user.type(editor, 'text');

      editor.setSelectionRange(0, 4);

      const italicButton = screen.getByRole('button', { name: /italic/i });
      await user.click(italicButton);

      expect(editor.value).toContain('*text*');
    });

    it('inserts link markdown syntax', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const linkButton = screen.getByRole('button', { name: /link/i });
      await user.click(linkButton);

      const editor = screen.getByRole('textbox');
      expect(editor.value).toContain('[](url)');
    });

    it('inserts code block', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const codeButton = screen.getByRole('button', { name: /code/i });
      await user.click(codeButton);

      const editor = screen.getByRole('textbox');
      expect(editor.value).toContain('```');
    });

    it('inserts list', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const listButton = screen.getByRole('button', { name: /list/i });
      await user.click(listButton);

      const editor = screen.getByRole('textbox');
      expect(editor.value).toContain('- ');
    });

    it('toggles line wrap', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      const wrapButton = screen.getByRole('button', { name: /wrap/i });
      await user.click(wrapButton);

      const editor = screen.getByRole('textbox');
      expect(editor.classList.contains('wrap') || editor.style.whiteSpace === 'pre-wrap').toBe(true);
    });
  });

  describe('Keyboard shortcuts', () => {
    it('saves gist with Ctrl+S', async () => {
      const user = userEvent.setup();
      githubApi.createGist.mockResolvedValue(mockGist);

      renderWithRouter(<GistEditor />);

      const editor = screen.getByRole('textbox');
      await user.type(editor, 'content');

      await user.keyboard('{Control>}s{/Control}');

      await waitFor(() => {
        expect(githubApi.createGist).toHaveBeenCalled();
      });
    });

    it('toggles preview with Ctrl+P', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistEditor />);

      await user.keyboard('{Control>}p{/Control}');

      // Preview mode should toggle
      await waitFor(() => {
        expect(document.querySelector('.preview-only')).toBeInTheDocument();
      });
    });
  });
});
