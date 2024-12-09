import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';

const GistEditor = () => {
  const [gist, setGist] = useState({ description: '', files: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [splitRatio, setSplitRatio] = useState(50);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const editorContainerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const horizontalDividerRef = useRef(null);
  const verticalDividerRef = useRef(null);

  useEffect(() => {
    if (id) fetchGist(id);
  }, [id]);

  const fetchGist = async (gistId) => {
    try {
      setLoading(true);
      setError(null);
      const gistData = await getGist(gistId);
      setGist(gistData);
    } catch (err) {
      console.error('Error fetching gist:', err);
      setError('Failed to fetch gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResize = () => {
    const horizontalDivider = horizontalDividerRef.current;
    const verticalDivider = verticalDividerRef.current;
    const editorContainer = editorContainerRef.current;

    let isDraggingHorizontal = false;
    let isDraggingVertical = false;

    const handleMouseMove = (e) => {
      if (isDraggingHorizontal && editorContainer) {
        const rect = editorContainer.getBoundingClientRect();
        const newHeight = Math.max(100, Math.min(rect.height - 100, e.clientY - rect.top));
        editorContainer.style.height = `${newHeight}px`;
      }

      if (isDraggingVertical && leftPanelRef.current && rightPanelRef.current) {
        const rect = editorContainer.getBoundingClientRect();
        const newLeftWidth = Math.max(100, Math.min(rect.width - 100, e.clientX - rect.left));
        setSplitRatio((newLeftWidth / rect.width) * 100);
      }
    };

    const handleMouseUp = () => {
      isDraggingHorizontal = false;
      isDraggingVertical = false;
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleHorizontalMouseDown = () => {
      isDraggingHorizontal = true;
      document.body.style.cursor = 'row-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleVerticalMouseDown = () => {
      isDraggingVertical = true;
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    horizontalDivider?.addEventListener('mousedown', handleHorizontalMouseDown);
    verticalDivider?.addEventListener('mousedown', handleVerticalMouseDown);

    return () => {
      horizontalDivider?.removeEventListener('mousedown', handleHorizontalMouseDown);
      verticalDivider?.removeEventListener('mousedown', handleVerticalMouseDown);
    };
  };

  useEffect(handleResize, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (id) {
        await updateGist(id, gist);
      } else {
        await createGist(gist);
      }
      navigate('/gists');
    } catch (err) {
      console.error('Error saving gist:', err);
      setError('Failed to save gist. Please try again later.');
    } finally {
      setLoading(false);
    }
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

  if (!user) return <div className="text-center text-gray-700">Please log in to edit gists.</div>;
  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <form onSubmit={handleSubmit} className="w-full h-full flex flex-col">
      <div className="toolbar">
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className="btn-secondary"
        >
          {previewMode ? 'Editor Mode' : 'Preview Mode'}
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Gist'}
        </button>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={wrapText}
            onChange={() => setWrapText(!wrapText)}
            className="form-checkbox"
          />
          <span>Wrap Text</span>
        </label>
      </div>

      <div ref={editorContainerRef} className="editor-container">
        <div
          ref={leftPanelRef}
          className="left-panel"
          style={{ width: `${splitRatio}%` }}
        >
          <textarea
            ref={editorRef}
            className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
            placeholder="Left panel text..."
            onScroll={syncScroll}
          />
        </div>
        {previewMode && <div ref={verticalDividerRef} className="vertical-divider" />}
        <div
          ref={rightPanelRef}
          className="right-panel"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <textarea
            ref={previewRef}
            className="editor"
            placeholder="Right panel text..."
            onScroll={syncScroll}
          />
        </div>
      </div>
      <div ref={horizontalDividerRef} className="horizontal-divider" />
    </form>
  );
};

export default GistEditor;
