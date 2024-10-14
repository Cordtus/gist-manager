import axios from 'axios';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
});

export const setAuthToken = (token) => {
  githubApi.defaults.headers.common['Authorization'] = `token ${token}`;
};

export const getGists = async () => {
  try {
    const response = await githubApi.get('/gists');
    return response.data;
  } catch (error) {
    console.error('Error fetching gists:', error);
    throw error;
  }
};

export const getGist = async (id) => {
  try {
    const response = await githubApi.get(`/gists/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching gist:', error);
    throw error;
  }
};

export const createGist = async (gistData) => {
  try {
    const response = await githubApi.post('/gists', gistData);
    return response.data;
  } catch (error) {
    console.error('Error creating gist:', error);
    throw error;
  }
};

export const updateGist = async (id, gistData) => {
  try {
    const response = await githubApi.patch(`/gists/${id}`, gistData);
    return response.data;
  } catch (error) {
    console.error('Error updating gist:', error);
    throw error;
  }
};

export const deleteGist = async (id) => {
  try {
    await githubApi.delete(`/gists/${id}`);
  } catch (error) {
    console.error('Error deleting gist:', error);
    throw error;
  }
};

export default githubApi;