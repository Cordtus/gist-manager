// GistEditor.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import '../styles/gisteditor.css';

const GistEditor = () => {
  const [gist, setGist] = useState({ description: '', files: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorRef = useRef(null);
  const previewRef = useRef(null);

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
    setGist((prevGist) => ({
      ...prevGist,
      files: {
        ...prevGist.files,
        [fileName]: { content },
      },
    }));
  };

  const syncScroll = (e) => {
    if (!previewMode) return;

    const source = e.target;
    const target = source === editorRef.current ? previewRef.current : editorRef.current;

    if (source && target) {
      const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
    }
  };

  const toggleWrapText = () => setWrapText(!wrapText);

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
          <form onSubmit={handleSubmit} className="gist-editor-form flex flex-col min-h-[80%] box-border p-3 overflow-hidden">
            <div className={`buttons-container flex items-center gap-3 h-14 p-2 mt-2`}>
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className={`button secondary ${previewMode && 'bg-gray-200'}`}
              >
                {previewMode ? 'Editor Mode' : 'Preview Mode'}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Gist'}
              </button>
              <label className="wrap-text text-sm">
                <input
                  type="checkbox"
                  checked={wrapText}
                  onChange={toggleWrapText}
                  className="mr-2"
                />
                Wrap Text
              </label>
            </div>

            <div className="toolbar flex gap-2 justify-start items-center p-2 bg-gray-50 border-b sticky top-0 left-0 z-10">
              <button type="button" className="toolbar-button">B</button>
              <button type="button" className="toolbar-button">I</button>
              <button type="button" className="toolbar-button">H1</button>
            </div>

            {Object.entries(gist.files).map(([fileName, file]) => (
              <div key={fileName} className="file-container mb-5 flex flex-col">
                <div className="file-header flex justify-between items-center mb-2">
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => {
                      const newFiles = { ...gist.files };
                      newFiles[e.target.value] = newFiles[fileName];
                      delete newFiles[fileName];
                      setGist({ ...gist, files: newFiles });
                    }}
                    className="file-name flex-1 p-2 mr-3 border border-gray-300 rounded text-sm box-border"
                  />
                  <button
                    type="button"
                    onClick={() => handleFileChange(fileName, '')}
                    className="remove-file text-red-500 cursor-pointer text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className={`editor-container flex ${previewMode && 'h-[calc(80vh_-_60px)]'}`}>
                  <textarea
                    ref={editorRef}
                    value={file.content}
                    onChange={(e) => handleFileChange(fileName, e.target.value)}
                    onScroll={syncScroll}
                    className={`editor flex-1 p-3 font-mono box-border overflow-auto ${wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}
                  />
                  {previewMode && (
                    <div
                      ref={previewRef}
                      className="preview flex-1 bg-gray-50 border-l border-gray-300"
                      onScroll={syncScroll}
                    >
                      <ReactMarkdown>{file.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </form>
  );
};

export default GistEditor;
