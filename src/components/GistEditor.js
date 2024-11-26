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
    <form onSubmit={handleSubmit} className="gist-editor-form">
      {/* Buttons area (Save/Mode/Wrap Text) */}
      <div className={`buttons-container ${previewMode ? 'preview' : ''}`}>
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className="button secondary"
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
        <label className="wrap-text">
          <input
            type="checkbox"
            checked={wrapText}
            onChange={toggleWrapText}
          />
          Wrap Text
        </label>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button type="button" className="toolbar-button">B</button>
        <button type="button" className="toolbar-button">I</button>
        <button type="button" className="toolbar-button">H1</button>
        {/* Add more toolbar buttons as needed */}
      </div>

      {/* Files Editor */}
      {Object.entries(gist.files).map(([fileName, file]) => (
        <div key={fileName} className="file-container">
          <div className="file-header">
            <input
              type="text"
              value={fileName}
              onChange={(e) => {
                const newFiles = { ...gist.files };
                newFiles[e.target.value] = newFiles[fileName];
                delete newFiles[fileName];
                setGist({ ...gist, files: newFiles });
              }}
              className="file-name"
            />
            <button
              type="button"
              onClick={() => handleFileChange(fileName, '')}
              className="remove-file"
            >
              Remove
            </button>
          </div>
          <div className={`editor-container ${previewMode ? 'split-view' : ''}`}>
            <textarea
              ref={editorRef}
              value={file.content}
              onChange={(e) => handleFileChange(fileName, e.target.value)}
              onScroll={syncScroll}
              className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
            />
            {previewMode && (
              <div
                ref={previewRef}
                className="preview"
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
