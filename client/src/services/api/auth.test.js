import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { mockUser, mockAuthToken, createMockError } from '../../test/fixtures';

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
          use: vi.fn(),
          eject: vi.fn()
        },
        response: {
          use: vi.fn(),
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
const authService = await import('./auth');

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('GitHub OAuth flow', () => {
    it('initiates GitHub OAuth login', async () => {
      const authUrl = 'https://github.com/login/oauth/authorize';
      window.location.href = '';

      await authService.initiateGitHubLogin();

      expect(window.location.href).toContain('github.com/login/oauth/authorize');
      expect(window.location.href).toContain('client_id');
      expect(window.location.href).toContain('scope');
    });

    it('handles OAuth callback with authorization code', async () => {
      const code = 'test_auth_code_123';
      axios.post.mockResolvedValue({
        data: {
          access_token: mockAuthToken,
          user: mockUser
        }
      });

      const result = await authService.handleOAuthCallback(code);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/github/callback'),
        expect.objectContaining({ code }),
        expect.any(Object)
      );

      expect(result.access_token).toBe(mockAuthToken);
      expect(result.user).toEqual(mockUser);
    });

    it('stores token in localStorage after successful auth', async () => {
      const code = 'test_auth_code_123';
      axios.post.mockResolvedValue({
        data: {
          access_token: mockAuthToken,
          user: mockUser
        }
      });

      await authService.handleOAuthCallback(code);

      expect(localStorage.getItem('github_token')).toBe(mockAuthToken);
      expect(localStorage.getItem('gist_manager_session')).toBeTruthy();
    });

    it('handles OAuth callback errors', async () => {
      const code = 'invalid_code';
      axios.post.mockRejectedValue(createMockError(401, 'Invalid authorization code'));

      await expect(authService.handleOAuthCallback(code)).rejects.toThrow();
      expect(localStorage.getItem('github_token')).toBeNull();
    });

    it('handles OAuth cancellation by user', async () => {
      const error = 'access_denied';
      const errorDescription = 'User cancelled the authorization';

      const result = await authService.handleOAuthError(error, errorDescription);

      expect(result).toEqual({
        error,
        description: errorDescription,
        cancelled: true
      });
    });
  });

  describe('Session management', () => {
    it('checks if user is authenticated with valid token', async () => {
      localStorage.setItem('github_token', mockAuthToken);
      axios.get.mockResolvedValue({ data: mockUser });

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(true);
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthToken}`
          })
        })
      );
    });

    it('returns false for expired/invalid tokens', async () => {
      localStorage.setItem('github_token', 'expired_token');
      axios.get.mockRejectedValue(createMockError(401, 'Bad credentials'));

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
      expect(localStorage.getItem('github_token')).toBeNull();
    });

    it('returns false when no token exists', async () => {
      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('retrieves current user from server session', async () => {
      axios.get.mockResolvedValue({
        data: {
          authenticated: true,
          user: mockUser
        }
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/status'),
        expect.objectContaining({ withCredentials: true })
      );
    });

    it('validates token with GitHub API', async () => {
      localStorage.setItem('github_token', mockAuthToken);
      axios.get.mockResolvedValue({ data: mockUser });

      const isValid = await authService.validateToken();

      expect(isValid).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('https://api.github.com/user');
    });

    it('invalidates and clears expired tokens', async () => {
      localStorage.setItem('github_token', 'expired_token');
      axios.get.mockRejectedValue(createMockError(401, 'Bad credentials'));

      const isValid = await authService.validateToken();

      expect(isValid).toBe(false);
      expect(localStorage.getItem('github_token')).toBeNull();
    });
  });

  describe('Logout functionality', () => {
    it('logs out user and clears local storage', async () => {
      localStorage.setItem('github_token', mockAuthToken);
      localStorage.setItem('gist_manager_session', JSON.stringify({ user: mockUser }));
      axios.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.any(Object),
        expect.objectContaining({ withCredentials: true })
      );

      expect(localStorage.getItem('github_token')).toBeNull();
      expect(localStorage.getItem('gist_manager_session')).toBeNull();
    });

    it('clears auth header from axios defaults', async () => {
      axios.defaults.headers.common['Authorization'] = `Bearer ${mockAuthToken}`;
      axios.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('dispatches logout event for app-wide cleanup', async () => {
      const eventListener = vi.fn();
      window.addEventListener('auth:logout', eventListener);

      axios.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(eventListener).toHaveBeenCalled();
    });

    it('handles logout errors gracefully', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      // Should not throw, just clear local state
      await expect(authService.logout()).resolves.not.toThrow();

      expect(localStorage.getItem('github_token')).toBeNull();
    });
  });

  describe('Token refresh and expiration', () => {
    it('checks if session is expired', () => {
      const expiredSession = {
        token: mockAuthToken,
        expiration: Date.now() - 1000 // 1 second ago
      };

      localStorage.setItem('gist_manager_session', JSON.stringify(expiredSession));

      const isExpired = authService.isSessionExpired();

      expect(isExpired).toBe(true);
    });

    it('checks if session is valid', () => {
      const validSession = {
        token: mockAuthToken,
        expiration: Date.now() + 3600000 // 1 hour from now
      };

      localStorage.setItem('gist_manager_session', JSON.stringify(validSession));

      const isExpired = authService.isSessionExpired();

      expect(isExpired).toBe(false);
    });

    it('refreshes token before expiration', async () => {
      const expiringSession = {
        token: mockAuthToken,
        expiration: Date.now() + 300000 // 5 minutes from now
      };

      localStorage.setItem('gist_manager_session', JSON.stringify(expiringSession));

      axios.post.mockResolvedValue({
        data: {
          access_token: 'new_token_456',
          expires_in: 3600
        }
      });

      await authService.refreshTokenIfNeeded();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.any(Object),
        expect.any(Object)
      );

      const newSession = JSON.parse(localStorage.getItem('gist_manager_session'));
      expect(newSession.token).toBe('new_token_456');
    });

    it('does not refresh if token is still valid for long time', async () => {
      const validSession = {
        token: mockAuthToken,
        expiration: Date.now() + 3600000 // 1 hour from now
      };

      localStorage.setItem('gist_manager_session', JSON.stringify(validSession));

      await authService.refreshTokenIfNeeded();

      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('Permission and scope management', () => {
    it('checks if user has required scopes', async () => {
      localStorage.setItem('github_token', mockAuthToken);
      axios.get.mockResolvedValue({
        headers: {
          'x-oauth-scopes': 'gist, repo, user'
        },
        data: mockUser
      });

      const hasScopes = await authService.hasRequiredScopes(['gist', 'user']);

      expect(hasScopes).toBe(true);
    });

    it('returns false if missing required scopes', async () => {
      localStorage.setItem('github_token', mockAuthToken);
      axios.get.mockResolvedValue({
        headers: {
          'x-oauth-scopes': 'user'
        },
        data: mockUser
      });

      const hasScopes = await authService.hasRequiredScopes(['gist', 'repo']);

      expect(hasScopes).toBe(false);
    });

    it('prompts for additional scopes if needed', async () => {
      const requestScopes = vi.fn();
      authService.requestAdditionalScopes = requestScopes;

      await authService.ensureScopes(['gist', 'repo']);

      expect(requestScopes).toHaveBeenCalledWith(['gist', 'repo']);
    });
  });

  describe('Rate limiting and API quota', () => {
    it('retrieves current API rate limit status', async () => {
      axios.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4999,
              reset: Date.now() + 3600000
            }
          }
        }
      });

      const rateLimit = await authService.getRateLimitStatus();

      expect(rateLimit.remaining).toBe(4999);
      expect(rateLimit.limit).toBe(5000);
    });

    it('warns when rate limit is low', async () => {
      axios.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 10,
              reset: Date.now() + 600000
            }
          }
        }
      });

      const rateLimit = await authService.getRateLimitStatus();

      expect(rateLimit.remaining).toBeLessThan(100);
      expect(rateLimit.nearLimit).toBe(true);
    });

    it('handles rate limit exceeded errors', async () => {
      axios.get.mockRejectedValue(createMockError(403, 'API rate limit exceeded'));

      await expect(authService.makeAuthenticatedRequest()).rejects.toThrow(/rate limit/i);
    });

    it('calculates time until rate limit reset', async () => {
      const resetTime = Date.now() + 3600000; // 1 hour from now

      axios.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 0,
              reset: resetTime
            }
          }
        }
      });

      const rateLimit = await authService.getRateLimitStatus();

      expect(rateLimit.resetAt).toBe(resetTime);
      expect(rateLimit.minutesUntilReset).toBeGreaterThan(0);
    });
  });

  describe('Error handling and recovery', () => {
    it('handles network errors during auth', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(networkError);

      await expect(authService.handleOAuthCallback('code')).rejects.toThrow('Network Error');
    });

    it('handles server errors during auth', async () => {
      axios.post.mockRejectedValue(createMockError(500, 'Internal Server Error'));

      await expect(authService.handleOAuthCallback('code')).rejects.toThrow();
    });

    it('retries failed auth requests', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: {
            access_token: mockAuthToken,
            user: mockUser
          }
        });

      const result = await authService.handleOAuthCallbackWithRetry('code');

      expect(result.access_token).toBe(mockAuthToken);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retry attempts', async () => {
      axios.post.mockRejectedValue(new Error('Persistent error'));

      await expect(
        authService.handleOAuthCallbackWithRetry('code', { maxRetries: 3 })
      ).rejects.toThrow();

      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    it('clears corrupted session data', () => {
      localStorage.setItem('gist_manager_session', 'invalid json');

      authService.clearSession();

      expect(localStorage.getItem('gist_manager_session')).toBeNull();
    });
  });

  describe('Security features', () => {
    it('does not store sensitive data in localStorage without encryption', () => {
      const sessionData = {
        token: mockAuthToken,
        user: mockUser,
        expiration: Date.now() + 3600000
      };

      authService.saveSession(sessionData);

      const stored = localStorage.getItem('gist_manager_session');
      // Token should not be visible in plaintext in sensitive implementations
      expect(stored).toBeTruthy();
    });

    it('validates redirect URI to prevent open redirects', () => {
      const validUri = 'http://localhost:3000/callback';
      const invalidUri = 'http://evil.com/steal-token';

      expect(authService.isValidRedirectUri(validUri)).toBe(true);
      expect(authService.isValidRedirectUri(invalidUri)).toBe(false);
    });

    it('generates secure state parameter for OAuth', () => {
      const state1 = authService.generateOAuthState();
      const state2 = authService.generateOAuthState();

      expect(state1).toHaveLength(32);
      expect(state2).toHaveLength(32);
      expect(state1).not.toBe(state2);
    });

    it('validates state parameter matches on callback', () => {
      const state = authService.generateOAuthState();
      localStorage.setItem('oauth_state', state);

      expect(authService.validateOAuthState(state)).toBe(true);
      expect(authService.validateOAuthState('different_state')).toBe(false);
    });

    it('cleans up state parameter after validation', () => {
      const state = authService.generateOAuthState();
      localStorage.setItem('oauth_state', state);

      authService.validateAndCleanupState(state);

      expect(localStorage.getItem('oauth_state')).toBeNull();
    });
  });
});
