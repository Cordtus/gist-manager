import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { setAuthToken, api } from '../services/api/github';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Client ID:', process.env.REACT_APP_GITHUB_CLIENT_ID);
    console.log('Redirect URI:', process.env.REACT_APP_REDIRECT_URI);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('oauth_state');
    setUser(null);
    setAuthToken(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      setAuthToken(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const initiateGithubLogin = () => {
    const state = generateRandomString(32);
    localStorage.setItem('oauth_state', state);
    
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
      redirect_uri: process.env.REACT_APP_REDIRECT_URI,
      scope: 'gist user',
      state: state
    });
  
    console.log('Login URL:', `https://github.com/login/oauth/authorize?${params}`);
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  const login = async (code, state) => {
    try {
      const savedState = localStorage.getItem('oauth_state');
      if (!state || state !== savedState) {
        throw new Error('Invalid state parameter');
      }
      localStorage.removeItem('oauth_state');

      const response = await api.post('/api/auth/github', { code });

      const { access_token } = response.data;
      
      if (!access_token) {
        throw new Error('No access token received');
      }

      localStorage.setItem('github_token', access_token);
      setAuthToken(access_token);
      
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      logout();
      return false;
    }
  };

  const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('github_token');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        loading, 
        initiateGithubLogin, 
        isAuthenticated 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;