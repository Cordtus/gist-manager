// Test fixtures for consistent testing across the suite

export const mockGist = {
  id: 'test-gist-123',
  description: 'Test Gist Description',
  public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  files: {
    'test.js': {
      filename: 'test.js',
      type: 'application/javascript',
      language: 'JavaScript',
      raw_url: 'https://gist.githubusercontent.com/test/test.js',
      size: 100,
      content: 'console.log("test");'
    },
    'README.md': {
      filename: 'README.md',
      type: 'text/markdown',
      language: 'Markdown',
      raw_url: 'https://gist.githubusercontent.com/test/README.md',
      size: 50,
      content: '# Test Gist\n\nThis is a test.'
    }
  },
  owner: {
    login: 'testuser',
    id: 123,
    avatar_url: 'https://avatars.githubusercontent.com/u/123',
    url: 'https://api.github.com/users/testuser'
  },
  comments: 0,
  comments_url: 'https://api.github.com/gists/test-gist-123/comments',
  html_url: 'https://gist.github.com/test-gist-123',
  git_pull_url: 'https://gist.github.com/test-gist-123.git',
  git_push_url: 'https://gist.github.com/test-gist-123.git'
};

export const mockGistList = [
  mockGist,
  {
    ...mockGist,
    id: 'test-gist-456',
    description: 'Another Test Gist',
    files: {
      'script.py': {
        filename: 'script.py',
        type: 'text/x-python',
        language: 'Python',
        raw_url: 'https://gist.githubusercontent.com/test/script.py',
        size: 200,
        content: 'print("hello world")'
      }
    }
  },
  {
    ...mockGist,
    id: 'test-gist-789',
    description: 'Private Test Gist',
    public: false,
    files: {
      'config.json': {
        filename: 'config.json',
        type: 'application/json',
        language: 'JSON',
        raw_url: 'https://gist.githubusercontent.com/test/config.json',
        size: 150,
        content: '{"key": "value"}'
      }
    }
  }
];

export const mockUser = {
  login: 'testuser',
  id: 123,
  avatar_url: 'https://avatars.githubusercontent.com/u/123',
  name: 'Test User',
  email: 'test@example.com',
  bio: 'Test bio',
  public_gists: 10,
  public_repos: 20,
  followers: 5,
  following: 3,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockAuthToken = 'ghp_test_token_1234567890';

export const mockSharedGist = {
  _id: 'shared-123',
  gistId: 'test-gist-123',
  title: 'Shared Test Gist',
  description: 'A test gist shared to community',
  username: 'testuser',
  tags: ['javascript', 'test'],
  isPublic: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  stars: 5,
  views: 100
};

export const mockComment = {
  id: 1,
  body: 'This is a test comment',
  user: mockUser,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Mock GitHub API responses
export const mockGitHubResponses = {
  listGists: {
    status: 200,
    data: mockGistList
  },
  getGist: {
    status: 200,
    data: mockGist
  },
  createGist: {
    status: 201,
    data: mockGist
  },
  updateGist: {
    status: 200,
    data: { ...mockGist, description: 'Updated description' }
  },
  deleteGist: {
    status: 204,
    data: null
  },
  getCurrentUser: {
    status: 200,
    data: mockUser
  },
  unauthorized: {
    status: 401,
    data: { message: 'Requires authentication' }
  },
  notFound: {
    status: 404,
    data: { message: 'Not Found' }
  },
  rateLimit: {
    status: 403,
    data: { message: 'API rate limit exceeded' }
  }
};

// Helper function to create mock axios responses
export const createMockResponse = (data, status = 200) => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {}
});

// Helper to create mock error
export const createMockError = (status, message) => {
  const error = new Error(message);
  error.response = {
    status,
    data: { message },
    statusText: 'Error'
  };
  return error;
};
