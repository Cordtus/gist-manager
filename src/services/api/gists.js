import githubApi from './github';

export const getGists = async () => {
  try {
    const response = await githubApi.get('/gists');
    return response.data;
  } catch (error) {
    console.error('Error fetching gists:', error);
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

export const updateGist = async (gistId, gistData) => {
  try {
    const response = await githubApi.patch(`/gists/${gistId}`, gistData);
    return response.data;
  } catch (error) {
    console.error('Error updating gist:', error);
    throw error;
  }
};

export const deleteGist = async (gistId) => {
  try {
    await githubApi.delete(`/gists/${gistId}`);
  } catch (error) {
    console.error('Error deleting gist:', error);
    throw error;
  }
};