// src/components/GistEditor.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { isGistShared, shareGist, unshareGist } from '../services/api/sharedGists';
import { useAuth } from '../contexts/AuthContext';
import MarkdownPreview from './markdown/MarkdownPreview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/gistEditor.css';
import '../styles/markdownPreview.css';

/**
 * Reusable component for grouping toolbar buttons
 */
const ToolbarGroup = ({ items }) => (
  <div className="toolbar-group">
    {items.map(item => (
      <button
        key={item.key}
        type="button"
        onClick={item.onClick}
        className="toolbar-button"
        title={item.title}
      >
        {item.icon}
      </button>
    ))}
  </div>
);

/**
 * Visual divider for toolbar sections
 */
const Divider = () => <div className="toolbar-divider" />;

const GistEditor = () => {
  // State and refs
  const [gist, setGist] = useState({ description: '', files: { 'newfile.md': { content: '' } }, public: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState(true);
  const [wrapText, setWrapText] = useState(true);
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

  // Fetch or initialize
  useEffect(() => {
    if (id) {
      fetchGist(id);
      checkIfGistIsShared(id);
    } else {
      setActiveFile('newfile.md');
    }
  }, [id]);

  // Set active file when gist is loaded
  useEffect(() => {
    if (gist && Object.keys(gist.files).length && !activeFile) {
      setActiveFile(Object.keys(gist.files)[0]);
    }
  }, [gist, activeFile]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = e => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(Math.max(ratio, 15), 85));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizeHandleRef.current?.classList.remove('active');
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizeHandleRef.current?.classList.add('active');
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = e => { 
    e.preventDefault(); 
    setIsResizing(true); 
  };

  // API calls
  const fetchGist = async gistId => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGist(gistId);
      setGist(data);
      setActiveFile(Object.keys(data.files)[0]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkIfGistIsShared = async gistId => {
    try {
      const shared = await isGistShared(gistId);
      setIsShared(shared);
    } catch (err) {
      console.error(err);
      // Silent error - doesn't affect core functionality
    }
  };

  // Form submission handler
  const handleSubmit = async e => {
    e.preventDefault();
    if (!Object.keys(gist.files).length) {
      setError('Your gist must contain at least one non-empty file!');
      return;
    }
    if (Object.values(gist.files).some(f => !f.content.trim())) {
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
      } else {
        const newG = await createGist(gist);
        setSuccess('Gist created successfully!');
        navigate(`/gist/${newG.id}`);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please check browser console and create an issue if persistent.');
    } finally {
      setLoading(false);
    }
  };

  // Field change handlers
  const handleDescriptionChange = e => setGist(prev => ({ ...prev, description: e.target.value }));
  const handlePublicChange = e => setGist(prev => ({ ...prev, public: e.target.checked }));
  
  const handleFileChange = useCallback((fileName, content) => {
    setGist(prev => ({ ...prev, files: { ...prev.files, [fileName]: { content } } }));
  }, []);
  
  const addNewFile = () => {
    let name = 'newfile.md', i = 1;
    while (gist.files[name]) name = `newfile_${i++}.md`;
    setGist(prev => ({ ...prev, files: { ...prev.files, [name]: { content: '' } } }));
    setActiveFile(name);
  };
  
  const removeFile = fn => {
    if (Object.keys(gist.files).length <= 1) { 
      setError('Cannot remove the only file.'); 
      return; 
    }
    const files = { ...gist.files };
    delete files[fn];
    setGist(prev => ({ ...prev, files }));
    if (activeFile === fn) setActiveFile(Object.keys(files)[0]);
  };

  // Community Shared Gists
  const handleShareGist = async e => {
    if (!id) return;
    const share = e.target.checked;
    setSharingLoading(true);
    try {
      if (share && !isShared) {
        if (!gist.public) { 
          setError('Only public gists can be shared with the community'); 
          setSharingLoading(false); 
          return; 
        }
        await shareGist(id, gist);
        setIsShared(true);
        setSuccess('Gist shared with the community!');
      } else if (!share && isShared) {
        await unshareGist(id);
        setIsShared(false);
        setSuccess('Gist removed from community sharing!');
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to ${isShared ? 'unshare' : 'share'} gist. Please try again later.`);
    } finally {
      setSharingLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Synchronize scrolling between editor and preview
  const syncScroll = useCallback(e => {
    if (!previewMode) return;
    const src = e.target;
    const dst = src === editorRef.current ? previewRef.current : editorRef.current;
    if (dst && !isResizing) {
      window.requestAnimationFrame(() => {
        const ratio = src.scrollTop / ((src.scrollHeight - src.clientHeight) || 1);
        dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
      });
    }
  }, [previewMode, isResizing]);

  const toggleWrapText = () => setWrapText(w => !w);

  // Text insertion helper for toolbar actions
  const insertText = useCallback((before, after = '') => {
    if (!editorRef.current || !activeFile) return;
    const ta = editorRef.current;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    const txt = before + sel + after;
    const newPos = sel ? s + before.length + sel.length + after.length : s + before.length;
    handleFileChange(activeFile, value.slice(0, s) + txt + value.slice(e));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newPos, newPos); }, 0);
  }, [activeFile, handleFileChange]);

  // Toolbar actions
  const handleBoldClick = useCallback(() => insertText('**','**'), [insertText]);
  const handleItalicClick = useCallback(() => insertText('*','*'), [insertText]);
  const handleStrikethroughClick = useCallback(() => insertText('~~','~~'), [insertText]);
  const handleHeadingClick = useCallback(level => insertText('#'.repeat(level) + ' ','\n'), [insertText]);
  const handleLinkClick = useCallback(() => {
    const sel = editorRef.current?.value.slice(editorRef.current.selectionStart, editorRef.current.selectionEnd) || '';
    insertText(sel.trim() ? '[' : '[Link text](', sel.trim() ? '](https://)' : ')');
  }, [insertText]);
  const handleImageClick = useCallback(() => insertText('![Alt text](',')'), [insertText]);
  const handleCodeClick = useCallback(() => insertText('`','`'), [insertText]);
  const handleCodeBlockClick = useCallback(() => insertText('```\n','\n```'), [insertText]);
  const handleBulletListClick = useCallback(() => insertText('- ','\n- '), [insertText]);
  const handleNumberedListClick = useCallback(() => insertText('1. ','\n2. '), [insertText]);
  const handleTaskListClick = useCallback(() => insertText('- [ ] ','\n- [ ] '), [insertText]);
  const handleQuoteClick = useCallback(() => insertText('> ','\n'), [insertText]);
  const handleTableClick = useCallback(() => insertText('| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |\n| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |',''), [insertText]);
  const handleHorizontalRuleClick = useCallback(() => insertText('\n---\n',''), [insertText]);
  const handleDetailsClick = useCallback(() => insertText('<details>\n<summary>Title</summary>\n','\n</details>'), [insertText]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = e => {
      if (document.activeElement !== editorRef.current) return;
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'b': e.preventDefault(); handleBoldClick(); break;
          case 'i': e.preventDefault(); handleItalicClick(); break;
          case 'k': e.preventDefault(); handleLinkClick(); break;
          case '\\': e.preventDefault(); handleCodeClick(); break;
          case '/': e.preventDefault(); setPreviewMode(pm => !pm); break;
          default: break;
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleBoldClick, handleItalicClick, handleLinkClick, handleCodeClick]);

  // Helpers
  const isMarkdownFile = fn => fn?.match(/\.(md|markdown|mdx)$/i);
  const getFileLanguage = fn => {
    const ext = fn.split('.').pop().toLowerCase();
    const map = { js:'javascript', jsx:'jsx', ts:'typescript', tsx:'tsx', py:'python', rb:'ruby', java:'java', go:'go', html:'html', css:'css', scss:'scss', json:'json', yaml:'yaml', yml:'yaml', sh:'bash', txt:'text' };
    return map[ext] || 'text';
  };

  // Toolbar button arrays
  const formattingButtons = [
    { 
      key: 'bold', 
      title: 'Bold (Ctrl+B)', 
      icon: <span className="toolbar-icon bold">B</span>, 
      onClick: handleBoldClick 
    },
    { 
      key: 'italic', 
      title: 'Italic (Ctrl+I)', 
      icon: <span className="toolbar-icon italic">I</span>, 
      onClick: handleItalicClick 
    },
    { 
      key: 'strike', 
      title: 'Strikethrough', 
      icon: <span className="toolbar-icon strike">S</span>, 
      onClick: handleStrikethroughClick 
    }
  ];
  
  const headingButtons = [
    { key: 'h1', title: 'Heading 1', icon: 'H1', onClick: () => handleHeadingClick(1) },
    { key: 'h2', title: 'Heading 2', icon: 'H2', onClick: () => handleHeadingClick(2) },
    { key: 'h3', title: 'Heading 3', icon: 'H3', onClick: () => handleHeadingClick(3) }
  ];
  
  const linkButtons = [
    { 
      key: 'link', 
      title: 'Insert Link (Ctrl+K)', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      ),
      onClick: handleLinkClick 
    },
    { 
      key: 'image', 
      title: 'Insert Image', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      ), 
      onClick: handleImageClick 
    }
  ];
  
  const codeButtons = [
    { 
      key: 'inline', 
      title: 'Inline Code (Ctrl+\\)', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
      ), 
      onClick: handleCodeClick 
    },
    { 
      key: 'block', 
      title: 'Code Block', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V5h16v14z"/>
        </svg>
      ), 
      onClick: handleCodeBlockClick 
    }
  ];
  
  const listButtons = [
    { 
      key: 'bullet', 
      title: 'Bullet List', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
        </svg>
      ), 
      onClick: handleBulletListClick 
    },
    { 
      key: 'number', 
      title: 'Numbered List', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
        </svg>
      ), 
      onClick: handleNumberedListClick 
    },
    { 
      key: 'task', 
      title: 'Task List', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
          <path d="M18 9l-1.4-1.4-5.6 5.6-2.6-2.6L7 12l4 4z"/>
        </svg>
      ), 
      onClick: handleTaskListClick 
    }
  ];
  
  const otherFormattingButtons = [
    { 
      key: 'quote', 
      title: 'Blockquote', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
      ), 
      onClick: handleQuoteClick 
    },
    { 
      key: 'table', 
      title: 'Table', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16m-7 6h7"/>
        </svg>
      ), 
      onClick: handleTableClick 
    },
    { 
      key: 'hr', 
      title: 'Horizontal Rule', 
      icon: (
        <svg className="toolbar-icon" viewBox="0 0 24 24">
          <path d="M4 12h16"/>
        </svg>
      ), 
      onClick: handleHorizontalRuleClick 
    }
  ];
  
  const specialButtons = [
    { 
      key: 'details', 
      title: 'Collapsible Details', 
      icon: (
        <div className="flex items-center">
          <svg className="toolbar-icon mr-1" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7"/>
          </svg>
          Details
        </div>
      ), 
      onClick: handleDetailsClick 
    }
  ];

  // Render
  if (!user) return <div className="p-6 bg-surface rounded shadow-md text-center">Please log in to edit gists.</div>;
  if (loading && id) return <div className="p-6 bg-surface rounded shadow-md text-center">Loading…</div>;

  const currentFileContent = activeFile ? gist.files[activeFile]?.content || '' : '';
  const editorStyle = previewMode ? { width: `${splitRatio}%` } : { width: '100%' };
  const previewStyle = { width: `${100 - splitRatio}%` };

  return (
    <form onSubmit={handleSubmit} className="gist-editor-form">
      {/* Description & Settings */}
      <div className="p-4 border-b border-default">
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description [optional]
          </label>
          <input
            type="text"
            id="description"
            value={gist.description}
            onChange={handleDescriptionChange}
            placeholder="Enter a description for your gist"
            className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="public"
              checked={gist.public}
              onChange={handlePublicChange}
              className="h-4 w-4 text-primary border-default rounded"
            />
            <label htmlFor="public" className="ml-2 block text-sm">
              Public gist
            </label>
            <span className="ml-2 text-xs text-secondary">(Anyone can see this gist)</span>
          </div>
          {id && (
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
                gist.public
                  ? 'bg-success-subtle text-success'
                  : 'bg-secondary-subtle text-secondary'
              }`}>
                {gist.public ? 'Public' : 'Private'}
              </span>
            </div>
          )}
          {id && gist.public && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="share-community"
                checked={isShared}
                onChange={handleShareGist}
                className="h-4 w-4 text-primary border-default rounded"
                disabled={sharingLoading}
              />
              <label htmlFor="share-community" className="ml-2 block text-sm">
                Share with Community
              </label>
              <span className="ml-2 text-xs text-secondary">
                (Make this gist visible in Community Gists)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-danger-subtle text-danger border-b border-danger-subtle">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-success-subtle text-success border-b border-success-subtle">{success}</div>
      )}

      {/* Controls */}
      <div className={`buttons-container ${previewMode ? 'preview' : ''}`}>
        <button
          type="button"
          onClick={addNewFile}
          className="button secondary flex items-center"
          title="Add a new file"
        >
          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add File
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(pm => !pm)}
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

      {/* File Tabs */}
      <div className="border-b border-default bg-surface-secondary px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {Object.keys(gist.files).map(filename => (
            <button
              key={filename}
              type="button"
              onClick={() => setActiveFile(filename)}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap transition ${
                activeFile === filename
                  ? 'bg-surface text-primary border border-default shadow-sm'
                  : 'text-default hover:bg-surface-hover'
              }`}
              aria-current={activeFile === filename ? 'true' : undefined}
            >
              {filename}
              {Object.keys(gist.files).length > 1 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile(filename); }}
                  className="ml-2 text-secondary hover:text-danger"
                  title="Remove this file"
                  aria-label={`Remove file ${filename}`}
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
        <ToolbarGroup items={formattingButtons} />
        <Divider />
        <ToolbarGroup items={headingButtons} />
        <Divider />
        <ToolbarGroup items={linkButtons} />
        <Divider />
        <ToolbarGroup items={codeButtons} />
        <Divider />
        <ToolbarGroup items={listButtons} />
        <Divider />
        <ToolbarGroup items={otherFormattingButtons} />
        <Divider />
        <ToolbarGroup items={specialButtons} />
      </div>

      {/* Editor & Preview */}
      {activeFile && (
        <div ref={containerRef} className={`editor-container ${previewMode ? 'split-view' : ''}`}>
          <textarea
            ref={editorRef}
            value={currentFileContent}
            onChange={e => handleFileChange(activeFile, e.target.value)}
            onScroll={syncScroll}
            className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
            style={editorStyle}
            placeholder="Enter file content here..."
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
              />
              <div 
                ref={previewRef} 
                className="preview" 
                onScroll={syncScroll} 
                style={previewStyle} 
                aria-label="Preview pane"
              >
                {isMarkdownFile(activeFile)
                  ? <MarkdownPreview content={currentFileContent} />
                  : <SyntaxHighlighter language={getFileLanguage(activeFile)} style={tomorrow} className="syntax-highlighter">
                      {currentFileContent}
                    </SyntaxHighlighter>
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-default bg-surface-secondary text-xs text-secondary">
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