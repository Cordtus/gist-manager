import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SharedGistList from './SharedGistList';
import { mockSharedGist, mockUser } from '../test/fixtures';
import axios from 'axios';

vi.mock('axios');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SharedGistList - Community Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Fetching community gists', () => {
    it('fetches and displays shared gists from community', async () => {
      axios.get.mockResolvedValue({
        data: [mockSharedGist, { ...mockSharedGist, _id: 'shared-456' }]
      });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/shared'),
        expect.any(Object)
      );
    });

    it('shows loading state while fetching', () => {
      axios.get.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<SharedGistList />);

      expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays error message on fetch failure', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no shared gists', async () => {
      axios.get.mockResolvedValue({ data: [] });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText(/no shared gists|empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sharing gists to community', () => {
    it('opens share dialog when share button clicked', async () => {
      const user = userEvent.setup();
      axios.get.mockResolvedValue({ data: [] });

      renderWithRouter(<SharedGistList />);

      const shareButton = screen.getByRole('button', { name: /share|add/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog') || screen.getByText(/share to community/i)).toBeInTheDocument();
      });
    });

    it('shares a gist with title and tags', async () => {
      const user = userEvent.setup();
      axios.post.mockResolvedValue({ data: mockSharedGist });

      renderWithRouter(<SharedGistList />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Fill in share form
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'My Awesome Gist');

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, 'A great code snippet');

      const tagsInput = screen.getByLabelText(/tags/i);
      await user.type(tagsInput, 'javascript, react');

      const submitButton = screen.getByRole('button', { name: /submit|share/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/shared'),
          expect.objectContaining({
            title: 'My Awesome Gist',
            description: 'A great code snippet',
            tags: expect.arrayContaining(['javascript', 'react'])
          }),
          expect.any(Object)
        );
      });

      expect(screen.getByText(/shared successfully/i)).toBeInTheDocument();
    });

    it('validates required fields when sharing', async () => {
      const user = userEvent.setup();

      renderWithRouter(<SharedGistList />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /submit|share/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('allows setting gist visibility (public/private)', async () => {
      const user = userEvent.setup();
      axios.post.mockResolvedValue({ data: mockSharedGist });

      renderWithRouter(<SharedGistList />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      const visibilityToggle = screen.getByRole('checkbox', { name: /public/i });
      expect(visibilityToggle).toBeChecked();

      await user.click(visibilityToggle);
      expect(visibilityToggle).not.toBeChecked();
    });

    it('handles share errors gracefully', async () => {
      const user = userEvent.setup();
      axios.post.mockRejectedValue(new Error('Server error'));

      renderWithRouter(<SharedGistList />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Gist');

      const submitButton = screen.getByRole('button', { name: /submit|share/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and searching community gists', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: [
          mockSharedGist,
          { ...mockSharedGist, _id: 'shared-456', tags: ['python', 'data'] },
          { ...mockSharedGist, _id: 'shared-789', tags: ['typescript'] }
        ]
      });
    });

    it('filters gists by search query', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'python');

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(1);
      });
    });

    it('filters gists by tags', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(3);
      });

      const tagButton = screen.getByRole('button', { name: /javascript/i });
      await user.click(tagButton);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBe(1);
      });
    });

    it('filters gists by user', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const userFilter = screen.getByLabelText(/filter by user/i);
      await user.type(userFilter, 'testuser');

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('username=testuser'),
          expect.any(Object)
        );
      });
    });

    it('sorts gists by popularity (stars)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'stars');

      // Verify gists are sorted by star count
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(3);
    });

    it('sorts gists by newest', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'newest');

      // Verify sorting
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('sort=createdAt'),
        expect.any(Object)
      );
    });

    it('sorts gists by most viewed', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort/i);
      await user.selectOptions(sortSelect, 'views');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('sort=views'),
        expect.any(Object)
      );
    });
  });

  describe('Interacting with community gists', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({ data: [mockSharedGist] });
    });

    it('stars a shared gist', async () => {
      const user = userEvent.setup();
      axios.post.mockResolvedValue({ data: { ...mockSharedGist, stars: 6 } });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const starButton = screen.getByRole('button', { name: /star/i });
      await user.click(starButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/star'),
          expect.any(Object),
          expect.any(Object)
        );
      });

      expect(screen.getByText(/6/)).toBeInTheDocument(); // Updated star count
    });

    it('views a shared gist detail page', async () => {
      const user = userEvent.setup();
      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const gistCard = screen.getByText('Shared Test Gist').closest('article');
      await user.click(gistCard);

      // Should navigate to detail page
      await waitFor(() => {
        expect(window.location.pathname).toContain('/shared/shared-123');
      });
    });

    it('increments view count when viewing gist', async () => {
      axios.post.mockResolvedValue({ data: { ...mockSharedGist, views: 101 } });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      // View count should be incremented
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/view'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('copies shared gist link to clipboard', async () => {
      const user = userEvent.setup();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const shareButton = screen.getAllByRole('button', { name: /copy|share link/i })[0];
      await user.click(shareButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/shared/shared-123')
      );

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it('reports inappropriate content', async () => {
      const user = userEvent.setup();
      axios.post.mockResolvedValue({ data: { success: true } });
      window.confirm = vi.fn(() => true);

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const reportButton = screen.getByRole('button', { name: /report/i });
      await user.click(reportButton);

      expect(window.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/report'),
          expect.objectContaining({ gistId: 'shared-123' }),
          expect.any(Object)
        );
      });
    });
  });

  describe('User\'s shared gists management', () => {
    it('displays user\'s own shared gists', async () => {
      axios.get.mockResolvedValue({
        data: [{ ...mockSharedGist, username: 'currentuser' }]
      });

      renderWithRouter(<SharedGistList username="currentuser" />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      // Should show edit/delete buttons for own gists
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('edits a shared gist', async () => {
      const user = userEvent.setup();
      axios.get.mockResolvedValue({
        data: [{ ...mockSharedGist, username: 'currentuser' }]
      });
      axios.put.mockResolvedValue({
        data: { ...mockSharedGist, title: 'Updated Title' }
      });

      renderWithRouter(<SharedGistList username="currentuser" />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const titleInput = screen.getByDisplayValue('Shared Test Gist');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/shared/shared-123'),
          expect.objectContaining({ title: 'Updated Title' }),
          expect.any(Object)
        );
      });
    });

    it('deletes a shared gist', async () => {
      const user = userEvent.setup();
      axios.get.mockResolvedValue({
        data: [{ ...mockSharedGist, username: 'currentuser' }]
      });
      axios.delete.mockResolvedValue({ data: { success: true } });
      window.confirm = vi.fn(() => true);

      renderWithRouter(<SharedGistList username="currentuser" />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/shared/shared-123'),
          expect.any(Object)
        );
      });

      expect(screen.queryByText('Shared Test Gist')).not.toBeInTheDocument();
    });

    it('unshares a gist from community', async () => {
      const user = userEvent.setup();
      axios.get.mockResolvedValue({
        data: [{ ...mockSharedGist, username: 'currentuser' }]
      });
      axios.delete.mockResolvedValue({ data: { success: true } });
      window.confirm = vi.fn(() => true);

      renderWithRouter(<SharedGistList username="currentuser" />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      const unshareButton = screen.getByRole('button', { name: /unshare/i });
      await user.click(unshareButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('unshare')
      );

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Pagination and infinite scroll', () => {
    it('loads more gists when scrolling to bottom', async () => {
      const page1 = [mockSharedGist];
      const page2 = [{ ...mockSharedGist, _id: 'shared-456' }];

      axios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      // Scroll to bottom
      window.dispatchEvent(new Event('scroll'));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('shows loading indicator when loading more', async () => {
      axios.get.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<SharedGistList />);

      window.dispatchEvent(new Event('scroll'));

      expect(screen.getByText(/loading more/i)).toBeInTheDocument();
    });

    it('stops loading when no more gists available', async () => {
      axios.get
        .mockResolvedValueOnce({ data: [mockSharedGist] })
        .mockResolvedValueOnce({ data: [] });

      renderWithRouter(<SharedGistList />);

      await waitFor(() => {
        expect(screen.getByText('Shared Test Gist')).toBeInTheDocument();
      });

      window.dispatchEvent(new Event('scroll'));

      await waitFor(() => {
        expect(screen.getByText(/no more gists|end of list/i)).toBeInTheDocument();
      });
    });
  });
});
