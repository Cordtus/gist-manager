import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api, githubApi, setAuthToken } from '../services/api/github.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('github_token');
    setUser(null);
    setToken(null);
    setAuthToken(null);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await githubApi.get('/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    const validateTokenAndFetchUser = async () => {
      const storedToken = localStorage.getItem('github_token');
      if (storedToken) {
        try {
          setToken(storedToken);
          setAuthToken(storedToken);
          await fetchUser();
        } catch (error) {
          console.error('Invalid or expired token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    validateTokenAndFetchUser();
  }, [fetchUser, logout]);

  const initiateGithubLogin = () => {
    const state = generateRandomString(32); // Generate a secure random state
    localStorage.setItem('oauth_state', state); // Save the state in localStorage for later validation
  
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
      redirect_uri: process.env.REACT_APP_REDIRECT_URI, // Match your GitHub app settings
      scope: 'gist user',
      state,
    });
  
    // Redirect to GitHub's OAuth URL
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  };

  const login = async (code, state) => {
    try {
      const savedState = localStorage.getItem('oauth_state');
      if (!state || state !== savedState) {
        console.error('Invalid state parameter:', { received: state, expected: savedState });
        throw new Error('Invalid state parameter');
      }

      localStorage.removeItem('oauth_state');

      const response = await api.post('/api/auth/github', { code });
      const { access_token } = response.data;

      if (!access_token) throw new Error('No access token received');

      setToken(access_token);
      setAuthToken(access_token);

      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        initiateGithubLogin,
        isAuthenticated: () => !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
};
