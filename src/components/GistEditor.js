// GistEditor.js

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { isGistShared, shareGist, unshareGist } from '../services/api/sharedGists';
import { useAuth } from '../contexts/AuthContext';
import MarkdownPreview from './markdown/MarkdownPreview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/gisteditor.css';
import '../styles/markdown-preview.css';

const GistEditor = () => {
  const [gist, setGist] = useState({ 
    description: '', 
    files: {
      'newfile.md': { content: '' }
    },
    public: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(true); // Default to preview mode
  const [wrapText, setWrapText] = useState(true);
  const [success, setSuccess] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const resizeHandleRef = useRef(null);

  // Initialize or fetch gist
  useEffect(() => {
    if (id) {
      fetchGist(id);
      checkIfGistIsShared(id);
    } else {
      // For new gists, set active file to the first file
      setActiveFile('newfile.md');
    }
  }, [id]);

  // When gist changes, set active file to the first file if not already set
  useEffect(() => {
    if (gist && Object.keys(gist.files).length > 0 && !activeFile) {
      setActiveFile(Object.keys(gist.files)[0]);
    }
  }, [gist, activeFile]);

  // Setup resize event listeners
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Limit the minimum size of each panel (15% - 85%)
      const limitedRatio = Math.min(Math.max(newRatio, 15), 85);
      setSplitRatio(limitedRatio);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      if (resizeHandleRef.current) {
        resizeHandleRef.current.classList.remove('active');
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      if (resizeHandleRef.current) {
        resizeHandleRef.current.classList.add('active');
      }
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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
      // Set active file to the first file
      if (Object.keys(gistData.files).length > 0) {
        setActiveFile(Object.keys(gistData.files)[0]);
      }
    } catch (error) {
      console.error('Error fetching gist:', error);
      setError('Failed to fetch gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkIfGistIsShared = async (gistId) => {
    try {
      const shared = await isGistShared(gistId);
      setIsShared(shared);
    } catch (error) {
      console.error('Error checking if gist is shared:', error);
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
      setError('All files must be non-empty!');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess('');
    
    try {
      if (id) {
        await updateGist(id, gist);
        setSuccess('Gist updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const newGist = await createGist(gist);
        setSuccess('Gist created successfully!');
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

  const handleFileChange = useCallback((fileName, content) => {
    setGist((prevGist) => ({
      ...prevGist,
      files: {
        ...prevGist.files,
        [fileName]: { content },
      },
    }));
  }, []);

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
    
    // Set active file to the new file
    setActiveFile(newFileName);
  };

  const removeFile = (fileName) => {
    // don't allow removing the only file
    if (Object.keys(gist.files).length <= 1) {
      setError('Cannot remove the only file.');
      return;
    }
    
    // create copy of files
    const updatedFiles = { ...gist.files };
    
    // remove file
    delete updatedFiles[fileName];
    
    setGist((prevGist) => ({
      ...prevGist,
      files: updatedFiles,
    }));
    
    // Set active file to another file if removing active file
    if (activeFile === fileName) {
      setActiveFile(Object.keys(updatedFiles)[0]);
    }
  };

  const handleShareGist = async (e) => {
    if (!id) return; // Can't share unsaved gist
    
    const shouldBeShared = e.target.checked;
    
    try {
      setSharingLoading(true);
      
      if (!shouldBeShared && isShared) {
        await unshareGist(id);
        setIsShared(false);
        setSuccess('Gist removed from community sharing!');
      } else if (shouldBeShared && !isShared) {
        if (!gist.public) {
          setError('Only public gists can be shared with the community');
          setSharingLoading(false);
          return;
        }
        await shareGist(id, gist);
        setIsShared(true);
        setSuccess('Gist shared with the community!');
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sharing/unsharing gist:', error);
      setError(`Failed to ${isShared ? 'unshare' : 'share'} gist. Please try again later.`);
    } finally {
      setSharingLoading(false);
    }
  };

  const syncScroll = useCallback((e) => {
    if (!previewMode) return;

    const source = e.target;
    const target = source === editorRef.current ? previewRef.current : editorRef.current;

    if (source && target && !isResizing) {
      // Use requestAnimationFrame for smooth scrolling
      window.requestAnimationFrame(() => {
        const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
        target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
      });
    }
  }, [previewMode, isResizing, editorRef, previewRef]);

  const toggleWrapText = () => setWrapText(!wrapText);

  // insert text at cursor
  const insertText = useCallback((before, after = '') => {
    if (!editorRef.current || !activeFile) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const newText = before + selection + after;
    
    // calculate cursor position
    const newCursorPos = selection ? start + before.length + selection.length + after.length : start + before.length;
    
    // update file content
    handleFileChange(activeFile, 
      textarea.value.substring(0, start) + newText + textarea.value.substring(end)
    );
    
    // set cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [activeFile, editorRef, handleFileChange]);

  // toolbar click handlers
  const handleBoldClick = useCallback(() => insertText('**', '**'), [insertText]);
  const handleItalicClick = useCallback(() => insertText('*', '*'), [insertText]);
  const handleStrikethroughClick = useCallback(() => insertText('~~', '~~'), [insertText]);
  const handleHeadingClick = useCallback((level) => insertText(`${'#'.repeat(level)} `, '\n'), [insertText]);
  const handleLinkClick = useCallback(() => {
    const selection = editorRef.current?.value.substring(
      editorRef.current.selectionStart, 
      editorRef.current.selectionEnd
    ) || '';
    
    if (selection.trim()) {
      insertText('[', '](https://)');
    } else {
      insertText('[Link text](https://)', '');
    }
  }, [insertText, editorRef]);
  const handleImageClick = useCallback(() => insertText('![Alt text](', ')'), [insertText]);
  const handleCodeClick = useCallback(() => insertText('`', '`'), [insertText]);
  const handleCodeBlockClick = useCallback(() => {
    const selection = editorRef.current?.value.substring(
      editorRef.current.selectionStart, 
      editorRef.current.selectionEnd
    ) || '';
    
    if (selection.trim()) {
      insertText('```\n', '\n```');
    } else {
      insertText('```javascript\n', '\n```');
    }
  }, [insertText, editorRef]);
  const handleBulletListClick = useCallback(() => insertText('- ', '\n- \n- '), [insertText]);
  const handleNumberedListClick = useCallback(() => insertText('1. ', '\n2. \n3. '), [insertText]);
  const handleTaskListClick = useCallback(() => insertText('- [ ] ', '\n- [ ] \n- [ ] '), [insertText]);
  const handleQuoteClick = useCallback(() => insertText('> ', '\n'), [insertText]);
  const handleTableClick = useCallback(() => insertText('| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |\n| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |\n', ''), [insertText]);
  const handleHorizontalRuleClick = useCallback(() => insertText('\n---\n', ''), [insertText]);
  const handleDetailsClick = useCallback(() => {
    insertText('<details>\n<summary>Title/description</summary>\n\n```javascript\ncode here\n```\n\n</details>', '');
  }, [insertText]);

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if textarea is focused
      if (document.activeElement !== editorRef.current) return;
      
      // Ctrl/Cmd + key combinations
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            handleBoldClick();
            break;
          case 'i':
            e.preventDefault();
            handleItalicClick();
            break;
          case 'k':
            e.preventDefault();
            handleLinkClick();
            break;
          case '\\':
            e.preventDefault();
            handleCodeClick();
            break;
          case '/':
            e.preventDefault();
            setPreviewMode(!previewMode);
            break;
          default:
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleBoldClick, handleCodeClick, handleItalicClick, handleLinkClick, previewMode]);

  // check if file is markdown
  const isMarkdownFile = (filename) => {
    return filename?.endsWith('.md') || filename?.endsWith('.markdown') || filename?.endsWith('.mdx');
  };

  // determine syntax highlighting
  const getFileLanguage = (filename) => {
    if (!filename) return 'text';
    
    const extension = filename.split('.').pop().toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown',
      'mdx': 'markdown',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sh': 'bash',
      'bash': 'bash',
      'bat': 'batch',
      'ps1': 'powershell',
      'sql': 'sql',
      'txt': 'text'
    };
    
    return languageMap[extension] || 'text';
  };

  if (!user) {
    return <div className="p-6 bg-white shadow rounded-lg">Please log in to edit gists.</div>;
  }

  if (loading && id) {
    return <div className="p-6 bg-white shadow rounded-lg">Loading...</div>;
  }

  // Get current file content
  const currentFileContent = activeFile ? gist.files[activeFile]?.content || '' : '';

  // custom styles for editor and preview based on splitRatio
  const editorStyle = previewMode ? { width: `${splitRatio}%` } : { width: '100%' };
  const previewStyle = { width: `${100 - splitRatio}%` };

  return (
    <form onSubmit={handleSubmit} className="gist-editor-form">
      {/* Gist description and settings */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description [optional]
          </label>
          <input
            type="text"
            id="description"
            value={gist.description}
            onChange={handleDescriptionChange}
            placeholder="Enter a description for your gist"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="public"
              checked={gist.public}
              onChange={handlePublicChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
            />
            <label htmlFor="public" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Public gist
            </label>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Anyone can see this gist)</span>
          </div>
          
          {/* Status Badge */}
          {id && (
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
                gist.public 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {gist.public ? 'Public' : 'Private'}
              </span>
            </div>
          )}
          
          {/* Add "Share with Community" checkbox when public is checked */}
          {id && gist.public && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="share-community"
                checked={isShared}
                onChange={handleShareGist}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
                disabled={sharingLoading}
              />
              <label htmlFor="share-community" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Share with Community
              </label>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Make this gist visible in Community Gists)
              </span>
            </div>
          )}
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
      <div className={`buttons-container ${previewMode ? 'preview' : ''}`}>
        <button
          type="button"
          onClick={addNewFile}
          className="button secondary flex items-center"
          title="Add a new file"
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
          title={previewMode ? "Editor only mode (Ctrl+/)" : "Split preview mode (Ctrl+/)"}
        >
          {previewMode ? 'Editor Only' : 'Split Preview'}
        </button>
        
        <button
          type="submit"
          className="button primary"
          disabled={loading}
          title="Save the current gist"
        >
          {loading ? 'Saving...' : (id ? 'Update Gist' : 'Create Gist')}
        </button>
        
        <div className="flex items-center ml-auto">
          <label className="wrap-text flex items-center dark:text-gray-300">
            <input
              type="checkbox"
              checked={wrapText}
              onChange={toggleWrapText}
              className="mr-2 dark:bg-gray-800 dark:border-gray-600"
            />
            <span className="text-sm">Wrap Text</span>
          </label>
        </div>
      </div>

      {/* File tabs */}
      <div className="border-b border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {Object.keys(gist.files).map(filename => (
            <button
              key={filename}
              type="button"
              onClick={() => setActiveFile(filename)}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap transition ${
                activeFile === filename
                  ? 'bg-white text-indigo-700 border border-gray-200 shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {filename}
              {Object.keys(gist.files).length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(filename);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                  title="Remove this file"
                >
                  ×
                </button>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="flex flex-wrap gap-1">
          {/* Text Formatting */}
          <button type="button" onClick={handleBoldClick} className="toolbar-button" title="Bold (Ctrl+B)">
            <span className="font-bold">B</span>
          </button>
          <button type="button" onClick={handleItalicClick} className="toolbar-button" title="Italic (Ctrl+I)">
            <span className="italic">I</span>
          </button>
          <button type="button" onClick={handleStrikethroughClick} className="toolbar-button" title="Strikethrough">
            <span className="line-through">S</span>
          </button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Headings */}
          <button type="button" onClick={() => handleHeadingClick(1)} className="toolbar-button" title="Heading 1">H1</button>
          <button type="button" onClick={() => handleHeadingClick(2)} className="toolbar-button" title="Heading 2">H2</button>
          <button type="button" onClick={() => handleHeadingClick(3)} className="toolbar-button" title="Heading 3">H3</button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Links and Media */}
          <button type="button" onClick={handleLinkClick} className="toolbar-button" title="Insert Link (Ctrl+K)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
            </svg>
          </button>
          <button type="button" onClick={handleImageClick} className="toolbar-button" title="Insert Image">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Code */}
          <button type="button" onClick={handleCodeClick} className="toolbar-button" title="Inline Code (Ctrl+\)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <button type="button" onClick={handleCodeBlockClick} className="toolbar-button" title="Code Block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Lists */}
          <button type="button" onClick={handleBulletListClick} className="toolbar-button" title="Bullet List">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <button type="button" onClick={handleNumberedListClick} className="toolbar-button" title="Numbered List">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <button type="button" onClick={handleTaskListClick} className="toolbar-button" title="Task List">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Other formatting */}
          <button type="button" onClick={handleQuoteClick} className="toolbar-button" title="Blockquote">
<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
          <button type="button" onClick={handleTableClick} className="toolbar-button" title="Table">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button type="button" onClick={handleHorizontalRuleClick} className="toolbar-button" title="Horizontal Rule">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
            </svg>
          </button>
          
          <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
          
          {/* Special elements */}
          <button type="button" onClick={handleDetailsClick} className="toolbar-button" title="Collapsible Details">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Details
          </button>
        </div>
      </div>

      {/* Editor and Preview */}
      {activeFile && (
        <div 
          ref={containerRef}
          className={`editor-container ${previewMode ? 'split-view' : ''}`}
        >
          <textarea
            ref={editorRef}
            value={currentFileContent}
            onChange={(e) => handleFileChange(activeFile, e.target.value)}
            onScroll={syncScroll}
            className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
            placeholder="Enter file content here..."
            style={editorStyle}
            aria-label={`Editor for ${activeFile}`}
          />
          {previewMode && (
            <>
              <div 
                ref={resizeHandleRef}
                className={`resize-handle ${isResizing ? 'active' : ''}`}
                onMouseDown={handleResizeStart}
                style={{ left: `${splitRatio}%` }}
                aria-hidden="true"
              ></div>
              <div
                ref={previewRef}
                className="preview"
                onScroll={syncScroll}
                style={previewStyle}
                aria-label="Preview pane"
              >
                {isMarkdownFile(activeFile) ? (
                  <MarkdownPreview content={currentFileContent} />
                ) : (
                  <SyntaxHighlighter
                    language={getFileLanguage(activeFile)}
                    style={tomorrow}
                    className="syntax-highlighter"
                  >
                    {currentFileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <details>
          <summary className="cursor-pointer">Keyboard Shortcuts</summary>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            <div><strong>Ctrl+B</strong>: Bold</div>
            <div><strong>Ctrl+I</strong>: Italic</div>
            <div><strong>Ctrl+K</strong>: Link</div>
            <div><strong>Ctrl+\</strong>: Inline Code</div>
            <div><strong>Ctrl+/</strong>: Toggle Preview</div>
          </div>
        </details>
      </div>
    </form>
  );
};

export default GistEditor;