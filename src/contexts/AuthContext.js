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
      setAuthToken(token); // Set the token for future API requests
      fetchUser();
    } else {
      setLoading(false); // No token found, stop loading
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('github_token')}`,
        },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
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
      
      // Store access token in localStorage
      localStorage.setItem('github_token', access_token);
      setAuthToken(access_token); // Set the token for future API requests
      
      await fetchUser(); // Fetch user data after login
      return true; // Indicate successful login
    } catch (error) {
      console.error('Login error:', error);
      return false; // Indicate failed login
    }
  };

  const logout = () => {
    localStorage.removeItem('github_token'); // Remove token from storage
    setUser(null); // Clear user data
    setAuthToken(null); // Remove token from future requests
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;