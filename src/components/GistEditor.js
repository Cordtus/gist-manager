// components/GistEditor.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';


const GistEditor = () => {
  const [gist, setGist] = useState({ description: '', files: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchGist(id);
    }
  }, [id]);

  const fetchGist = async (gistId) => {
    try {
      setLoading(true);
      setError(null);
      const gistData = await getGist(gistId);
      setGist(gistData);
    } catch (error) {
      console.error('Error fetching gist:', error);
      setError('Failed to fetch gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (id) {
        await updateGist(id, gist);
      } else {
        await createGist(gist);
      }
      navigate('/gists');
    } catch (error) {
      console.error('Error saving gist:', error);
      setError('Failed to save gist. Please try again later.');
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

  const addNewFile = () => {
    const newFileName = `file${Object.keys(gist.files).length + 1}.txt`;
    setGist(prevGist => ({
      ...prevGist,
      files: {
        ...prevGist.files,
        [newFileName]: { content: '' }
      }
    }));
  };

  const removeFile = (fileName) => {
    const newFiles = { ...gist.files };
    delete newFiles[fileName];
    setGist(prevGist => ({
      ...prevGist,
      files: newFiles
    }));
  };

  if (!user) {
    return <div>Please log in to edit gists.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
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
        <div key={fileName} className="border p-4 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <input
              type="text"
              value={fileName}
              onChange={(e) => {
                const newFiles = { ...gist.files };
                newFiles[e.target.value] = newFiles[fileName];
                delete newFiles[fileName];
                setGist({ ...gist, files: newFiles });
              }}
              className="font-medium"
            />
            <button
              type="button"
              onClick={() => removeFile(fileName)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div className="flex">
            <div className="w-1/2 pr-2">
              <textarea
                value={file.content}
                onChange={(e) => handleFileChange(fileName, e.target.value)}
                className="w-full h-64 p-2 border rounded"
              />
            </div>
            <div className="w-1/2 pl-2">
              {previewMode ? (
                fileName.endsWith('.md') ? (
                  <ReactMarkdown className="prose">
                    {file.content}
                  </ReactMarkdown>
                ) : (
                  <SyntaxHighlighter language="javascript" style={darcula}>
                    {file.content}
                  </SyntaxHighlighter>
                )
              ) : (
                <textarea
                  value={file.content}
                  readOnly
                  className="w-full h-64 p-2 border rounded bg-gray-100"
                />
              )}
            </div>
          </div>
        </div>
      ))}
      <div>
        <button
          type="button"
          onClick={addNewFile}
          className="mt-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Add New File
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className="mr-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {previewMode ? 'Edit Mode' : 'Preview Mode'}
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Gist'}
        </button>
      </div>
    </form>
  );
};

export default GistEditor;