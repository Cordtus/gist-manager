import React, { createContext, useState, useEffect, useContext } from 'react';
import { setAuthToken, api } from '../services/api/github';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      setAuthToken(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/user');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      // If there's an error fetching the user, clear the token
      localStorage.removeItem('github_token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (code) => {
    try {
      const response = await api.post('/api/auth/github', { code });
      const { access_token } = response.data;
      localStorage.setItem('github_token', access_token);
      setAuthToken(access_token);
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('github_token');
    setUser(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};