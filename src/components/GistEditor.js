// GistEditor.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import MarkdownPreview from './markdown/MarkdownPreview';
import '../styles/gisteditor.css';
import '../styles/markdown-preview.css';

const GistEditor = () => {
  const [gist, setGist] = useState({ 
    description: '', 
    files: {},
    public: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [success, setSuccess] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50); // Default 50/50 split
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const resizeHandleRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchGist(id);
    } else {
      // init with empty file for new gist
      setGist({
        description: '',
        files: {
          'newfile.md': { content: '' }
        },
        public: false
      });
    }
  }, [id]);

  // Setup resize event listeners
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Limit the minimum size of each panel
      if (newRatio >= 15 && newRatio <= 85) {
        setSplitRatio(newRatio);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

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
    
    // validate gist has files with content
    if (!Object.keys(gist.files).length) {
      setError('Your gist must contain at least one non-empty file!');
      return;
    }
    
    const hasEmptyFile = Object.values(gist.files).some(file => !file.content || file.content.trim() === '');
    if (hasEmptyFile) {
      setError('All files must be non-empty!.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess('');
    
    try {
      if (id) {
        await updateGist(id, gist);
        setSuccess('Gist updated.');
      } else {
        const newGist = await createGist(gist);
        setSuccess('New Gist created.');
        // switch to editor for new gist
        setTimeout(() => {
          navigate(`/gist/${newGist.id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving gist:', error);
      setError('Failed to save. Please check browser console and create an issue if persistent.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e) => {
    setGist((prevGist) => ({
      ...prevGist,
      description: e.target.value,
    }));
  };

  const handlePublicChange = (e) => {
    setGist((prevGist) => ({
      ...prevGist,
      public: e.target.checked,
    }));
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

  const addNewFile = () => {
    // generate unique filename
    let newFileName = 'newfile.md';
    let counter = 1;
    
    while (gist.files[newFileName]) {
      newFileName = `newfile_${counter}.md`;
      counter++;
    }
    
    setGist((prevGist) => ({
      ...prevGist,
      files: {
        ...prevGist.files,
        [newFileName]: { content: '' },
      },
    }));
  };

  const removeFile = (fileName) => {
    // create copy of files
    const updatedFiles = { ...gist.files };
    
    // remove file
    delete updatedFiles[fileName];
    
    // if no files left, add new empty one
    const files = Object.keys(updatedFiles).length === 0 
      ? { 'newfile.md': { content: '' } } 
      : updatedFiles;
    
    setGist((prevGist) => ({
      ...prevGist,
      files,
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

  // insert text at cursor
  const insertText = (before, after = '') => {
    if (!editorRef.current) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const newText = before + selection + after;
    
    // get current filename
    const currentFileName = Object.keys(gist.files)[0]; // Assuming we're working with the first file
    
    // calculate cursor position
    const newCursorPos = selection ? start + before.length + selection.length + after.length : start + before.length;
    
    // update file content
    handleFileChange(currentFileName, 
      textarea.value.substring(0, start) + newText + textarea.value.substring(end)
    );
    
    // set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // toolbar click handlers
  const handleBoldClick = () => insertText('**', '**');
  const handleItalicClick = () => insertText('*', '*');
  const handleH1Click = () => insertText('# ');
  const handleH2Click = () => insertText('## ');
  const handleH3Click = () => insertText('### ');
  const handleLinkClick = () => insertText('[', '](url)');
  const handleCodeClick = () => insertText('`', '`');
  const handleCodeBlockClick = () => insertText('```\n', '\n```');
  const handleListClick = () => insertText('- ');
  const handleQuoteClick = () => insertText('> ');
  const handleHorizontalRuleClick = () => insertText('\n---\n');
  const handleDetailsClick = () => insertText('<details>\n<summary>Title</summary>\n\n', '\n\n</details>');

  if (!user) {
    return <div className="p-6 bg-white shadow rounded-lg">Please log in to edit gists.</div>;
  }

  if (loading && id) {
    return <div className="p-6 bg-white shadow rounded-lg">Loading...</div>;
  }

  // custom styles for editor and preview based on splitRatio
  const editorStyle = previewMode ? { width: `${splitRatio}%` } : { width: '100%' };
  const previewStyle = { width: `${100 - splitRatio}%` };

  return (
    <form onSubmit={handleSubmit} className="gist-editor-form bg-white shadow rounded-lg overflow-hidden">
      {/* Gist description and settings */}
      <div className="p-4 border-b border-gray-200">
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description [optional]
          </label>
          <input
            type="text"
            id="description"
            value={gist.description}
            onChange={handleDescriptionChange}
            placeholder="Enter a description for your gist"
            className="w-full p-2 border border-gray-300 rounded focus-ring"
          />
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="public"
            checked={gist.public}
            onChange={handlePublicChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          <label htmlFor="public" className="ml-2 block text-sm text-gray-700">
            Public gist
          </label>
          <span className="ml-2 text-xs text-gray-500">(Anyone can see this gist)</span>
        </div>
      </div>

      {/* Success/Error messages */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border-b border-red-100">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 text-green-700 border-b border-green-100">
          {success}
        </div>
      )}

      {/* Buttons area (Save/Mode/Wrap Text) */}
      <div className={`buttons-container ${previewMode ? 'preview' : ''} p-4 border-b border-gray-200 flex-wrap`}>
        <button
          type="button"
          onClick={addNewFile}
          className="button secondary flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add File
        </button>
        
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
          {loading ? 'Saving...' : (id ? 'Update Gist' : 'Create Gist')}
        </button>
        
        <div className="flex items-center ml-auto">
          <label className="wrap-text flex items-center">
            <input
              type="checkbox"
              checked={wrapText}
              onChange={toggleWrapText}
              className="mr-2"
            />
            <span className="text-sm">Wrap Text</span>
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button type="button" onClick={handleBoldClick} className="toolbar-button" title="Bold">B</button>
        <button type="button" onClick={handleItalicClick} className="toolbar-button" title="Italic">I</button>
        <button type="button" onClick={handleH1Click} className="toolbar-button" title="Heading 1">H1</button>
        <button type="button" onClick={handleH2Click} className="toolbar-button" title="Heading 2">H2</button>
        <button type="button" onClick={handleH3Click} className="toolbar-button" title="Heading 3">H3</button>
        <button type="button" onClick={handleLinkClick} className="toolbar-button" title="Link">[Link]</button>
        <button type="button" onClick={handleCodeClick} className="toolbar-button" title="Inline Code">Code</button>
        <button type="button" onClick={handleCodeBlockClick} className="toolbar-button" title="Code Block">Code Block</button>
        <button type="button" onClick={handleListClick} className="toolbar-button" title="List">• List</button>
        <button type="button" onClick={handleQuoteClick} className="toolbar-button" title="Quote">Quote</button>
        <button type="button" onClick={handleHorizontalRuleClick} className="toolbar-button" title="Horizontal Rule">---</button>
        <button type="button" onClick={handleDetailsClick} className="toolbar-button" title="Collapsible Section">Details</button>
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
              onClick={() => removeFile(fileName)}
              className="remove-file"
            >
              Remove
            </button>
          </div>
          <div 
            ref={containerRef}
            className={`editor-container ${previewMode ? 'split-view' : ''}`}
          >
            <textarea
              ref={editorRef}
              value={file.content}
              onChange={(e) => handleFileChange(fileName, e.target.value)}
              onScroll={syncScroll}
              className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
              placeholder="Enter file content here..."
              style={editorStyle}
            />
            {previewMode && (
              <>
                <div 
                  ref={resizeHandleRef}
                  className={`resize-handle ${isResizing ? 'active' : ''}`}
                  onMouseDown={handleResizeStart}
                ></div>
                <div
                  ref={previewRef}
                  className="preview"
                  onScroll={syncScroll}
                  style={previewStyle}
                >
                  <MarkdownPreview content={file.content} />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </form>
  );
};

export default GistEditor;