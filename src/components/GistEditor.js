import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/github';
import { useAuth } from '../contexts/AuthContext';

const GistEditor = () => {
  const [gist, setGist] = useState({ description: '', files: {} });
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const history = useHistory();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchGist(id);
    }
  }, [id]);

  const fetchGist = async (gistId) => {
    try {
      setLoading(true);
      const gistData = await getGist(gistId);
      setGist(gistData);
    } catch (error) {
      console.error('Error fetching gist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
        await updateGist(id, gist);
      } else {
        await createGist(gist);
      }
      history.push('/gists');
    } catch (error) {
      console.error('Error saving gist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (fileName, content) => {
    setGist(prevGist => ({
      ...prevGist,
      files: {
        ...prevGist.files,
        [fileName]: { content }
      }
    }));
  };

  if (!user) {
    return <div>Please log in to edit gists.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          type="text"
          id="description"
          value={gist.description}
          onChange={(e) => setGist({ ...gist, description: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Gist description"
        />
      </div>
      {Object.entries(gist.files).map(([fileName, file]) => (
        <div key={fileName}>
          <label htmlFor={fileName} className="block text-sm font-medium text-gray-700">
            {fileName}
          </label>
          <textarea
            id={fileName}
            value={file.content}
            onChange={(e) => handleFileChange(fileName, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows="10"
          />
        </div>
      ))}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Gist'}
      </button>
    </form>
  );
};

export default GistEditor;