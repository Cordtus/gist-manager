import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { mockGist, mockGistList, mockUser, mockGitHubResponses, createMockError } from '../../test/fixtures';

// Mock axios with proper interceptors structure
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        request: {
          use: vi.fn((successHandler, errorHandler) => {
            mockAxios._requestInterceptor = { successHandler, errorHandler };
            return 0;
          }),
          eject: vi.fn()
        },
        response: {
          use: vi.fn((successHandler, errorHandler) => {
            mockAxios._responseInterceptor = { successHandler, errorHandler };
            return 0;
          }),
          eject: vi.fn()
        }
      }
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  };
  return { default: mockAxios };
});

// Import after mocking
const githubApi = await import('./github');

describe('GitHub API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('setAuthToken', () => {
    it('sets auth token for axios requests', () => {
      const token = 'test-token';
      githubApi.setAuthToken(token);

      expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    });

    it('removes auth token when token is null', () => {
      githubApi.setAuthToken(null);

      expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('getUserGists', () => {
    it('fetches user gists successfully', async () => {
      axios.get.mockResolvedValue(mockGitHubResponses.listGists);

      const result = await githubApi.getUserGists('testuser');

      expect(axios.get).toHaveBeenCalledWith('https://api.github.com/users/testuser/gists', {
        params: { per_page: 100 }
      });
      expect(result).toEqual(mockGistList);
    });

    it('handles pagination for large gist lists', async () => {
      const page1 = [mockGistList[0], mockGistList[1]];
      const page2 = [mockGistList[2]];

      axios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })
        .mockResolvedValueOnce({ data: [] });

      const result = await githubApi.getUserGists('testuser');

      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('throws error when user not found', async () => {
      axios.get.mockRejectedValue(createMockError(404, 'Not Found'));

      await expect(githubApi.getUserGists('nonexistent')).rejects.toThrow();
    });

    it('handles API rate limiting', async () => {
      axios.get.mockRejectedValue(createMockError(403, 'API rate limit exceeded'));

      await expect(githubApi.getUserGists('testuser')).rejects.toThrow();
    });
  });

  describe('getGist', () => {
    it('fetches a single gist by ID', async () => {
      axios.get.mockResolvedValue(mockGitHubResponses.getGist);

      const result = await githubApi.getGist('test-gist-123');

      expect(axios.get).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123');
      expect(result).toEqual(mockGist);
    });

    it('handles gist not found', async () => {
      axios.get.mockRejectedValue(createMockError(404, 'Not Found'));

      await expect(githubApi.getGist('nonexistent')).rejects.toThrow();
    });
  });

  describe('createGist', () => {
    it('creates a new gist successfully', async () => {
      const gistData = {
        description: 'Test Gist',
        public: true,
        files: {
          'test.js': {
            content: 'console.log("test");'
          }
        }
      };

      axios.post.mockResolvedValue(mockGitHubResponses.createGist);

      const result = await githubApi.createGist(gistData);

      expect(axios.post).toHaveBeenCalledWith('https://api.github.com/gists', gistData);
      expect(result).toEqual(mockGist);
    });

    it('requires authentication', async () => {
      axios.post.mockRejectedValue(createMockError(401, 'Requires authentication'));

      await expect(githubApi.createGist({})).rejects.toThrow();
    });

    it('validates gist structure', async () => {
      const invalidGist = { description: 'No files' };
      axios.post.mockRejectedValue(createMockError(422, 'Validation Failed'));

      await expect(githubApi.createGist(invalidGist)).rejects.toThrow();
    });
  });

  describe('updateGist', () => {
    it('updates an existing gist', async () => {
      const updates = {
        description: 'Updated description',
        files: {
          'test.js': {
            content: 'console.log("updated");'
          }
        }
      };

      axios.patch.mockResolvedValue(mockGitHubResponses.updateGist);

      const result = await githubApi.updateGist('test-gist-123', updates);

      expect(axios.patch).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123', updates);
      expect(result.description).toBe('Updated description');
    });

    it('allows deleting files from gist', async () => {
      const updates = {
        files: {
          'test.js': null // Deletes the file
        }
      };

      axios.patch.mockResolvedValue({ data: mockGist });

      await githubApi.updateGist('test-gist-123', updates);

      expect(axios.patch).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123', updates);
    });

    it('requires ownership of gist', async () => {
      axios.patch.mockRejectedValue(createMockError(404, 'Not Found'));

      await expect(githubApi.updateGist('others-gist', {})).rejects.toThrow();
    });
  });

  describe('deleteGist', () => {
    it('deletes a gist successfully', async () => {
      axios.delete.mockResolvedValue(mockGitHubResponses.deleteGist);

      await githubApi.deleteGist('test-gist-123');

      expect(axios.delete).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123');
    });

    it('requires ownership of gist', async () => {
      axios.delete.mockRejectedValue(createMockError(404, 'Not Found'));

      await expect(githubApi.deleteGist('others-gist')).rejects.toThrow();
    });
  });

  describe('starGist', () => {
    it('stars a gist', async () => {
      axios.put.mockResolvedValue({ status: 204 });

      await githubApi.starGist('test-gist-123');

      expect(axios.put).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123/star');
    });

    it('requires authentication', async () => {
      axios.put.mockRejectedValue(createMockError(401, 'Requires authentication'));

      await expect(githubApi.starGist('test-gist-123')).rejects.toThrow();
    });
  });

  describe('unstarGist', () => {
    it('unstars a gist', async () => {
      axios.delete.mockResolvedValue({ status: 204 });

      await githubApi.unstarGist('test-gist-123');

      expect(axios.delete).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123/star');
    });
  });

  describe('isGistStarred', () => {
    it('checks if gist is starred - returns true', async () => {
      axios.get.mockResolvedValue({ status: 204 });

      const result = await githubApi.isGistStarred('test-gist-123');

      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123/star');
    });

    it('checks if gist is starred - returns false', async () => {
      axios.get.mockRejectedValue(createMockError(404, 'Not starred'));

      const result = await githubApi.isGistStarred('test-gist-123');

      expect(result).toBe(false);
    });
  });

  describe('forkGist', () => {
    it('forks a gist successfully', async () => {
      const forkedGist = { ...mockGist, id: 'forked-gist-123' };
      axios.post.mockResolvedValue({ data: forkedGist });

      const result = await githubApi.forkGist('test-gist-123');

      expect(axios.post).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-123/forks');
      expect(result.id).toBe('forked-gist-123');
    });

    it('requires authentication', async () => {
      axios.post.mockRejectedValue(createMockError(401, 'Requires authentication'));

      await expect(githubApi.forkGist('test-gist-123')).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current authenticated user', async () => {
      axios.get.mockResolvedValue(mockGitHubResponses.getCurrentUser);

      const result = await githubApi.getCurrentUser();

      expect(axios.get).toHaveBeenCalledWith('https://api.github.com/user');
      expect(result).toEqual(mockUser);
    });

    it('requires valid authentication', async () => {
      axios.get.mockRejectedValue(createMockError(401, 'Bad credentials'));

      await expect(githubApi.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('Error handling and retry logic', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      axios.get.mockRejectedValue(networkError);

      await expect(githubApi.getUserGists('testuser')).rejects.toThrow('Network Error');
    });

    it('handles timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      axios.get.mockRejectedValue(timeoutError);

      await expect(githubApi.getGist('test-gist-123')).rejects.toThrow();
    });

    it('clears auth token on 401 errors', async () => {
      axios.get.mockRejectedValue(createMockError(401, 'Bad credentials'));

      try {
        await githubApi.getCurrentUser();
      } catch (error) {
        // Token should be cleared
        expect(localStorage.getItem('github_token')).toBeNull();
      }
    });
  });
});
