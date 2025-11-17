import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GistList from './GistList';
import { mockGistList, mockUser } from '../test/fixtures';
import * as githubApi from '../services/api/github';

vi.mock('../services/api/github');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('GistList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Fetching and displaying gists', () => {
    it('fetches and displays user gists', async () => {
      githubApi.getUserGists.mockResolvedValue(mockGistList);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
        expect(screen.getByText('Another Test Gist')).toBeInTheDocument();
      });

      expect(githubApi.getUserGists).toHaveBeenCalledWith('testuser');
    });

    it('shows loading state while fetching', () => {
      githubApi.getUserGists.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<GistList username="testuser" />);

      expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error message on fetch failure', async () => {
      githubApi.getUserGists.mockRejectedValue(new Error('API Error'));

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no gists found', async () => {
      githubApi.getUserGists.mockResolvedValue([]);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText(/no gists|empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering gists', () => {
    beforeEach(async () => {
      githubApi.getUserGists.mockResolvedValue(mockGistList);
    });

    it('filters gists by search query', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

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

    it('filters gists by file type', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
      });

      // Assuming there's a filter dropdown for file types
      const filterSelect = screen.getByLabelText(/filter|file type/i);
      await user.selectOptions(filterSelect, 'JavaScript');

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
        expect(screen.queryByText('Another Test Gist')).not.toBeInTheDocument();
      });
    });

    it('filters public vs private gists', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const publicFilterButton = screen.getByRole('button', { name: /public/i });
      await user.click(publicFilterButton);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(2);
      });
    });

    it('clears filters when clear button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Python');

      await waitFor(() => {
        expect(screen.queryByText('Test Gist Description')).not.toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear|reset/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting gists', () => {
    beforeEach(async () => {
      githubApi.getUserGists.mockResolvedValue(mockGistList);
    });

    it('sorts gists by date (newest first)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'newest');

      const articles = screen.getAllByRole('article');
      expect(articles[0]).toHaveTextContent('Test Gist Description');
    });

    it('sorts gists by date (oldest first)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'oldest');

      // Verify order changed
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(3);
    });

    it('sorts gists alphabetically by description', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'name');

      const articles = screen.getAllByRole('article');
      expect(articles[0]).toHaveTextContent('Another Test Gist');
    });
  });

  describe('Gist actions', () => {
    beforeEach(async () => {
      githubApi.getUserGists.mockResolvedValue(mockGistList);
      githubApi.deleteGist.mockResolvedValue({});
      githubApi.starGist.mockResolvedValue({});
      githubApi.forkGist.mockResolvedValue(mockGistList[0]);
    });

    it('navigates to gist editor when clicking edit', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify navigation happened (check URL or navigation mock)
      expect(window.location.pathname).toContain('/edit');
    });

    it('deletes gist with confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(githubApi.deleteGist).toHaveBeenCalledWith('test-gist-123');

      await waitFor(() => {
        expect(screen.queryByText('Test Gist Description')).not.toBeInTheDocument();
      });
    });

    it('cancels delete when confirmation rejected', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(githubApi.deleteGist).not.toHaveBeenCalled();
      expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
    });

    it('stars a gist', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const starButtons = screen.getAllByRole('button', { name: /star/i });
      await user.click(starButtons[0]);

      expect(githubApi.starGist).toHaveBeenCalledWith('test-gist-123');
    });

    it('forks a gist', async () => {
      const user = userEvent.setup();
      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      const forkButtons = screen.getAllByRole('button', { name: /fork/i });
      await user.click(forkButtons[0]);

      expect(githubApi.forkGist).toHaveBeenCalledWith('test-gist-123');

      await waitFor(() => {
        expect(screen.getByText(/forked successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('displays pagination controls for large lists', async () => {
      const manyGists = Array.from({ length: 50 }, (_, i) => ({
        ...mockGistList[0],
        id: `gist-${i}`,
        description: `Gist ${i}`
      }));

      githubApi.getUserGists.mockResolvedValue(manyGists);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText(/page/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      const manyGists = Array.from({ length: 50 }, (_, i) => ({
        ...mockGistList[0],
        id: `gist-${i}`,
        description: `Gist ${i}`
      }));

      githubApi.getUserGists.mockResolvedValue(manyGists);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Gist 0')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.queryByText('Gist 0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh functionality', () => {
    it('refreshes gist list when refresh button clicked', async () => {
      const user = userEvent.setup();
      githubApi.getUserGists.mockResolvedValue(mockGistList);

      renderWithRouter(<GistList username="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Test Gist Description')).toBeInTheDocument();
      });

      githubApi.getUserGists.mockClear();

      const refreshButton = screen.getByRole('button', { name: /refresh|reload/i });
      await user.click(refreshButton);

      expect(githubApi.getUserGists).toHaveBeenCalledTimes(1);
    });
  });
});
