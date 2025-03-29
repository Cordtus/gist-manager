// services/api/auth.js

import axios from 'axios';
import { setAuthToken } from './github';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const authenticateWithGitHub = async (code, state) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/github`, { code, state });

    const { access_token } = response.data;

    if (!access_token) throw new Error('No access token received');

    sessionStorage.setItem('github_token', access_token); // Store token in sessionStorage
    setAuthToken(access_token);

    return access_token;

  } catch (error) {
    console.error('Error authenticating with GitHub:', error.response?.data || error.message);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const token = sessionStorage.getItem('github_token');

    if (!token) throw new Error('No token found in session storage');

    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;

  } catch (error) {
    console.error('Error fetching current user:', error.response?.data || error.message);
    throw error;
  }
};
