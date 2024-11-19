// services/api/auth.js

import axios from 'axios';
import { setAuthToken } from './github';

const API_BASE_URL = 'http://localhost:5000';

export const authenticateWithGitHub = async (code) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/github`, { code });
    
    const { access_token } = response.data;
    
    if (!access_token) throw new Error('No access token received');
    
    setAuthToken(access_token);
    
    return access_token;
    
  } catch (error) {
    console.error('Error authenticating with GitHub:', error);
    
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${localStorage.getItem('github_token')}`
      }
    });
    
    return response.data;
    
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    throw error;
  }
};